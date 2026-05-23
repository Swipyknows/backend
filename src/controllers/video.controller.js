import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {Response} from "../utils/ApiResponse.js"
import {asynchandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


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
                    {"owner.username": { $regex: query, $options: "i" }
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

    return res.status(200).json(new Response(true, "Videos fetched successfully", paginatedVideos))
})

const publishAVideo = asynchandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const videofile = req.files?.video[0]?.path;
    const thumbnailfile = req.files?.thumbnail[0]?.path;
    if(!videofile || !thumbnailfile){
        throw new ApiError(400,"Video file and thumbnail are required")
    }
    const videoUrl = await uploadOnCloudinary(videofile, "video")
    const thumbnailUrl = await uploadOnCloudinary(thumbnailfile, "image")
    const video = await Video.create({
        title,
        description,
        videoUrl,
        thumbnailUrl,
        owner: req.user._id,
        ispublisher: true
    })
    return res.status(201)
    .json(new Response(true, "Video published successfully", video))
})

const getVideoById = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    return res.status(200)
    .json(new Response(true, "Video fetched successfully", video))
})

const updateVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description } = req.body
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    video.title = title || video.title
    video.description = description || video.description
    await video.save()
    return res.status(200)
    .json(new Response(true, "Video updated successfully", video))
})

const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    Video.findByIdAndDelete(videoId)
    return res.status(200)
    .json(new Response(true, "Video deleted successfully"))
    //TODO: delete video
})

const togglePublishStatus = asynchandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to perform this action")
    }
    video.ispublisher = !video.ispublisher
    await video.save()
    return res.status(200)
    .json(new Response(true, `Video ${video.ispublisher ? "published" : "unpublished"} successfully`, video))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}