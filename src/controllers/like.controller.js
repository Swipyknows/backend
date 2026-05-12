import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import {Like} from "../models/like.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {Response} from "../utils/apiresponse.js"
import {Comment} from "../models/comment.model.js"

const likeVideoOrComment = asynchandler(async (req,res)=>{
    const {videoId,commentId} = req.params;
    if(!vidoeId && !commentId){
        throw new ApiError("VideoId or commentId is required",400)
    }
    const likedBy=req.user._id;
    const existingLike = await Like.findOne(videoId?{video:videoId,likedBy}:{comment:commentId,likedBy})
    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id)
    }
    else{
        await Like.create({
            likedBy,
            video:videoId,
            comment:commentId
        })
    }
    return new Response(
        res
        ,200
        ,new ApiResponse(videoId?"Video like toggled":"Comment like toggled",{})
    )
})
export {
    likeVideoOrComment
}