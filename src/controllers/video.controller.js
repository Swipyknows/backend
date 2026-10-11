import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/apierror.js"
import { Response } from "../utils/apiresponse.js"
import { asynchandler } from "../utils/asynchandler.js"
import { uploadOnCloudinary, deleteLocalFile } from "../utils/cloudinary.js"
import { invalidatePattern } from "../utils/cache.invalidate.js"
import jwt from "jsonwebtoken"

const getAllVideos = asynchandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    const pipeline = [];

    if (query) {
        pipeline.push({
            $match: {
                $or: [
                    { title: { $regex: query, $options: "i" } },
                    { description: { $regex: query, $options: "i" } },
                    {
                        "owner.username": { $regex: query, $options: "i" }
                    }
                ]
            }
        });
    }

    if (userId) {
        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    pipeline.push({
        $match: { ispublisher: true }
    });

    if (sortBy && sortType) {
        const sortOrder = sortType === "desc" ? -1 : 1;
        pipeline.push({
            $sort: {
                [sortBy]: sortOrder
            }
        });
    } else {
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        });
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const videoAggregate = Video.aggregate(pipeline);
    const paginatedVideos = await Video.aggregatePaginate(videoAggregate, options);
    console.log(paginatedVideos)
    return res.status(200).json(new Response(true, paginatedVideos, "Videos fetched successfully"))
})

const publishAVideo = asynchandler(async (req, res) => {
    const { title, description } = req.body
    // TODO: get video, upload to cloudinary, create video
    const videofile = req.files?.video?.[0]?.path;
    const thumbnailfile = req.files?.thumbnail?.[0]?.path;
    if (!videofile || !thumbnailfile || !title || !description) {
        if (videofile) deleteLocalFile(videofile);
        if (thumbnailfile) deleteLocalFile(thumbnailfile);
        throw new ApiError(400, "All fields (title, description, video file and thumbnail) are required")
    }
    const videoUrl = await uploadOnCloudinary(videofile, "video")
    const thumbnailUrl = await uploadOnCloudinary(thumbnailfile, "image")
    if (!videoUrl?.url && !videoUrl?.secure_url) {
        throw new ApiError(400, "Video upload failed");
    }
    const video = await Video.create({
        title,
        description,
        videofile: videoUrl.secure_url || videoUrl.url,
        thumbnail: thumbnailUrl?.secure_url || thumbnailUrl?.url || "",
        duration: videoUrl.duration || 0,
        owner: req.user._id,
        ispublisher: true
    })
    invalidatePattern("videos_list:*");
    return res.status(201)
        .json(new Response(true, video, "Video published successfully"))
})

const getVideoById = asynchandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Increment video view count
    await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

    // Extract user ID if logged in (from middleware or token)
    let userId = req.user?._id;
    if (!userId) {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (token) {
            try {
                const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                if (decodedToken?._id) {
                    userId = decodedToken._id;
                }
            } catch (err) {
                // optional auth fail-open
            }
        }
    }

    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const videoAggregate = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner._id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                isLiked: userObjectId
                    ? { $in: [userObjectId, "$likes.likedBy"] }
                    : false,
                subscribersCount: { $size: "$subscribers" },
                isSubscribed: userObjectId
                    ? { $in: [userObjectId, "$subscribers.subscriber"] }
                    : false
            }
        },
        {
            $project: {
                _id: 1,
                videoFile: { $ifNull: ["$videofile", "$videoFile"] },
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                isLiked: 1,
                likesCount: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    fullname: "$owner.fullname",
                    avatar: "$owner.avatar",
                    subscribersCount: "$subscribersCount",
                    isSubscribed: "$isSubscribed"
                }
            }
        }
    ]);

    if (!videoAggregate?.length) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200)
        .json(new Response(200, videoAggregate[0], "Video fetched successfully"));
})

const updateVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    video.title = title || video.title
    video.description = description || video.description
    await video.save()
    invalidatePattern("videos_list:*");
    return res.status(200)
        .json(new Response(true, video, "Video updated successfully"))
})

const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    await Video.findByIdAndDelete(videoId)
    invalidatePattern("videos_list:*");
    return res.status(200)
        .json(new Response(true, "Video deleted successfully"))
    //TODO: delete video
})

const togglePublishStatus = asynchandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, "Video not found")
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to perform this action")
    }
    video.ispublisher = !video.ispublisher
    await video.save()
    return res.status(200)
        .json(new Response(true, video, `Video ${video.ispublisher ? "published" : "unpublished"} successfully`))
})
const uploadVideo = asynchandler(async (req, res) => {
    const videofile = req.files?.video?.[0]?.path;
    const thumbnailfile = req.files?.thumbnail?.[0]?.path;
    const { title, description } = req.body;
    if (!videofile || !thumbnailfile || !title || !description) {
        if (videofile) deleteLocalFile(videofile);
        if (thumbnailfile) deleteLocalFile(thumbnailfile);
        throw new ApiError(400, "All fields (title, description, video, thumbnail) are required")
    }
    const videoResponse = await uploadOnCloudinary(videofile, "video")
    const thumbnailResponse = await uploadOnCloudinary(thumbnailfile, "image")
    if (!videoResponse?.secure_url && !videoResponse?.url) {
        throw new ApiError(400, "Video upload failed");
    }
    const video = await Video.create({
        title,
        description,
        videofile: videoResponse.secure_url || videoResponse.url,
        thumbnail: thumbnailResponse?.secure_url || thumbnailResponse?.url || "",
        duration: videoResponse.duration || 0,
        owner: req.user._id
    })
    invalidatePattern("videos_list:*");
    return res.status(200)
        .json(new Response(true, video, "Video uploaded successfully"))
})
export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    uploadVideo
}