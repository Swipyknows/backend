import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {Response} from "../utils/apiresponse.js"
import jwt from "jsonwebtoken"

const generateAccessandRefreshToken=async(userid)=>{
    try {
        const user=await User.findById(userid);
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshToken=refreshToken;
        await user.save();
        return {accessToken,refreshToken}
    }
    catch(error){
        console.error("Token generation error:", error.message);
        throw new ApiError(500,"Token generation failed")
    }
}

const registerUser=asynchandler(async(req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    console.log("FULL REQ.BODY:", req.body);
    console.log("FULL REQ.FILES:", req.files);
    
    const {fullName, email, username, password }=req.body || {};
    console.log("Destructured - fullName:", fullName, "email:", email, "username:", username, "password:", password);
    // if(fullName === ""){
    //     throw new ApiError(400,"fullname is required");
    // }
    if(
        [fullName,email,password,username].some((field)=>field?.trim() === "")
    ){
        console.log("VALIDATION FAILED - Empty field detected");
        throw new ApiError(400,"All fields are required");
    }
    console.log("VALIDATION PASSED - All fields present");

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    console.log(req.body);
    const avatarlocalpath=req.files?.avatar[0]?.path;
    const coverImagelocalpath=req.files?.coverImage[0]?.path;
    console.log("avatar",avatarlocalpath);
    console.log("coverImage",coverImagelocalpath);
    if(!avatarlocalpath){
        throw new ApiError(400,"Avatar is required")    
    }
    const avatar = await uploadOnCloudinary(avatarlocalpath);
    const coverImage = await uploadOnCloudinary(coverImagelocalpath);
    if(!avatar){
        throw new ApiError(400,"Avatar is required")    
    }
    const user = await User.create({
        fullname: fullName,
        avatar:avatar.url,
        coverimage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500,"User registration failed")
    }
    return res.status(201).json(
        new Response(201,createdUser,"User registered successfully")
    )
})

const loginuser=asynchandler(async(req,res)=>{
    //req body ->data
    //username or email, password
    // find the user
    //check the password
    //access and refresh token
    //send cookie
    const {username,email,password}=req.body || {};
    if(!(username || email)){
        throw new ApiError(400,"Username or email is required")
    }
    const user=await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User not found")
    }
    const isPasswordValid=await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401,"Invalid password")
    }
    console.log("USER FOUND:", user);
    const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id);

    const loggedinUser = await User.findById(user._id).select("-password -refreshToken");
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("refreshToken",refreshToken,options)
    .cookie("accessToken",accessToken,options)
    .json(
        new Response(200,
            {user:loggedinUser,accessToken,refreshToken},
            "Login successful")
    )
})

const logoutUser=asynchandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,
        {
            $set : {refreshToken:undefined}
        },
        {new:true}
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .cookie("accessToken","",options)
    .cookie("refreshToken","",options)
    .json(
        new Response(200,null,"Logout successful")
    )
})

const refreshAccessToken=asynchandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user=await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
        if(user.refreshToken !== incomingRefreshToken){
            throw new ApiError(401," refresh token is expired or used")
        }
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newrefreshToken}=await generateAccessandRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new Response(200,{accessToken,newrefreshToken},"Access token refreshed successfully")
        )
    } catch (error) {
        throw new ApiError(401,"invalid refresh token")
    }
})
const changePassword =asynchandler(async(req,res)=>{
    const {currentPassword,newPassword}=req.body || {};
    if(!currentPassword || !newPassword){
        throw new ApiError(400,"Current and new password are required")
    }
    const user=await User.findById(req.user?._id);
    const isCurrentPasswordValid=await user.isPasswordCorrect(currentPassword);
    if(!isCurrentPasswordValid){
        throw new ApiError(401,"Current password is incorrect")
    }
    user.password=newPassword;
    await user.save({validatebeforeSave:false})
    return res
    .status(200)
    .json(
        new Response(200,null,"Password changed successfully")
    )
})
const getcurrentuser = asynchandler(async(req,res)=>{
    return res
    .status(200)
    .json(new Response(200,req.user,"Current user fetched successfully"))
})

const updateProfile=asynchandler(async(req,res)=>{
    const {fullName, email}=req.body || {};
    if(!fullName || !email){
        throw new ApiError(400,"Full name and email are required")
    }
    const updatedUser=await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email:email
            }
        },{
            new:true
        }
    ).select("-password -refreshToken")
    return res
    .status(200)
    .json(new Response(200,updatedUser,"Profile updated successfully"))
})
const updateUserAvatar=asynchandler(async(req,res)=>{
    // Implementation for updating user avatar
    const avatarLocalPath=req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400,"Avatar upload failed")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password ")
    return res
    .status(200)
    .json(new Response(200,null,"Avatar updated successfully"))
})
const updateUserCoverimage=asynchandler(async(req,res)=>{
    // Implementation for updating user cover image
    const coverImageLocalPath=req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is required")
    }
    const coverimage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverimage.url){
        throw new ApiError(400,"Coverimage upload failed")
    }
    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverimage: coverimage.url
            }
        },
        { new: true }
    ).select("-password ")
    return res
    .status(200)
    .json(new Response(200,null,"CoverImage updated successfully"))
})
const userchannelprofile=asynchandler(async(req,res)=>{
    const {username} = req.params;
    if(!username?.trim()){
        throw new ApiError(400,"Username is required")
    }
    const channel= await User.aggregate([
        {
            $match:{username:username.toLowerCase()}
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedChannels"
            }
        },
        {
            $addFields:{
                subscribersCount:{$size:"$subscribers"},
                subscribedtoCount:{$size:"$subscribedChannels"},
                issubscribed:{
                    $cond:{
                        if:{$in : [req.user?._id, "$subscribers.subscriber"]},
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $project:{
                fullname:1,
                username:1,
                avatar:1,
                coverimage:1,
                subscribersCount:1,
                subscribedtoCount:1,
                issubscribed:1,
                email:1
            }
        }
    ])
    console.log("CHANNEL PROFILE AGGREGATION RESULT:", channel);
    if(!channel?.length){
        throw new ApiError(404,"Channel not found")
    }
    return res
    .status(200)
    .json(new Response(200,channel[0],"Channel profile fetched successfully"))
})
const getUserWatchHistory=asynchandler(async(req,res)=>{
    const user= await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"Video",
                localField:"watchhistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullname:1,
                                        username:1,
                                        avatar:1    
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        },
    ])
    return res
    .status(200)
    .json(new Response(200,user[0]?.watchHistory || [],"User watch history fetched successfully"))
})
export {
    registerUser
    ,loginuser
    ,logoutUser
    ,refreshAccessToken
    ,changePassword
    ,getcurrentuser
    ,updateProfile
    ,updateUserAvatar
    ,updateUserCoverimage
    ,userchannelprofile
    ,getUserWatchHistory
};
