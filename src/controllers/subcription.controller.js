import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {Response} from "../utils/apiresponse.js"
import {Subscription} from "../models/subscription.model.js"

const subscriberorunsubscribe = asynchandler(async (req,res)=>{
    const {channelId} = req.params;
    const userId = req.user._id;
    if(channelId.toString() === userId.toString()){
        throw new ApiError("You cannot subscribe to yourself",400)
    }
    const user = await User.findById(channelId)
    if(!user){
        throw new ApiError("User not found",404)
    }
    const isSubscribed = await Subscription.findOne({
        subscriber:userId,
        channel:channelId
    })
    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed._id)
    }
    else{
        await Subscription.create({
            subscriber:userId,
            channel:channelId
        })
    }
    return res.status(200).json(
        new Response(200,{},isSubscribed?"Unsubscribed successfully":"Subscribed successfully")
    )
})