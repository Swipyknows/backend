import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {Response} from "../utils/apiresponse.js"
import {Comment} from "../models/comment.model.js"
const addComment = asynchandler(async (req,res)=>{
    const {content} =req.body;
    const {videoId} = req.params;
    if(!content.trim()){
        throw new ApiError("Comment content is required",400)
    }
    const comment = await Comment.create({
        content,
        video:videoId,
        user:req.user._id
    })
    return new Response(res)
    .status(201)
    .json(
        new ApiResponse("Comment added successfully",comment)
    )
})

const getVideoComments =asynchandler(async (req,res)=>{
    const {videoId} = req.params;
    const comments = await Comment
    .find({video:videoId})
    .populate("owner","username avatar")
    .sort({createdAt:-1})
    return new Response(res)
    .status(200)
    .json(
        new ApiResponse("Video comments fetched successfully",comments)
    )
})

const deleteComment = asynchandler(async (req,res)=>{
     const { commentId } = req.params
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404,"Comment not found")
    }
    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"Unauthorized")
    }
    await Comment.findByIdAndDelete(commentId)
    return new Response(res)
    .status(200)
    .json(
        new ApiResponse(200,{},"Comment deleted")
    )
})
export {
    addComment,
    getVideoComments,
    deleteComment
}