import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {Response} from "../utils/apiresponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

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


// import { asyncHandler } from "../utils/asyncHandler.js";
// import {ApiError} from "../utils/ApiError.js"
// import { User} from "../models/user.model.js"
// import {uploadOnCloudinary} from "../utils/cloudinary.js"
// import { ApiResponse } from "../utils/ApiResponse.js";
// import jwt from "jsonwebtoken"
// import mongoose from "mongoose";


// const generateAccessAndRefereshTokens = async(userId) =>{
//     try {
//         const user = await User.findById(userId)
//         const accessToken = user.generateAccessToken()
//         const refreshToken = user.generateRefreshToken()

//         user.refreshToken = refreshToken
//         await user.save({ validateBeforeSave: false })

//         return {accessToken, refreshToken}


//     } catch (error) {
//         throw new ApiError(500, "Something went wrong while generating referesh and access token")
//     }
// }

// const registerUser = asyncHandler( async (req, res) => {
//     // get user details from frontend
//     // validation - not empty
//     // check if user already exists: username, email
//     // check for images, check for avatar
//     // upload them to cloudinary, avatar
//     // create user object - create entry in db
//     // remove password and refresh token field from response
//     // check for user creation
//     // return res


//     const {fullName, email, username, password } = req.body
//     //console.log("email: ", email);

//     if (
//         [fullName, email, username, password].some((field) => field?.trim() === "")
//     ) {
//         throw new ApiError(400, "All fields are required")
//     }

//     const existedUser = await User.findOne({
//         $or: [{ username }, { email }]
//     })

//     if (existedUser) {
//         throw new ApiError(409, "User with email or username already exists")
//     }
//     //console.log(req.files);

//     const avatarLocalPath = req.files?.avatar[0]?.path;
//     //const coverImageLocalPath = req.files?.coverImage[0]?.path;

//     let coverImageLocalPath;
//     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
//         coverImageLocalPath = req.files.coverImage[0].path
//     }
    

//     if (!avatarLocalPath) {
//         throw new ApiError(400, "Avatar file is required")
//     }

//     const avatar = await uploadOnCloudinary(avatarLocalPath)
//     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

//     if (!avatar) {
//         throw new ApiError(400, "Avatar file is required")
//     }
   

//     const user = await User.create({
//         fullName,
//         avatar: avatar.url,
//         coverImage: coverImage?.url || "",
//         email, 
//         password,
//         username: username.toLowerCase()
//     })

//     const createdUser = await User.findById(user._id).select(
//         "-password -refreshToken"
//     )

//     if (!createdUser) {
//         throw new ApiError(500, "Something went wrong while registering the user")
//     }

//     return res.status(201).json(
//         new ApiResponse(200, createdUser, "User registered Successfully")
//     )

// } )

// const loginUser = asyncHandler(async (req, res) =>{
//     // req body -> data
//     // username or email
//     //find the user
//     //password check
//     //access and referesh token
//     //send cookie

//     const {email, username, password} = req.body
//     console.log(email);

//     if (!username && !email) {
//         throw new ApiError(400, "username or email is required")
//     }
    
//     // Here is an alternative of above code based on logic discussed in video:
//     // if (!(username || email)) {
//     //     throw new ApiError(400, "username or email is required")
        
//     // }

//     const user = await User.findOne({
//         $or: [{username}, {email}]
//     })

//     if (!user) {
//         throw new ApiError(404, "User does not exist")
//     }

//    const isPasswordValid = await user.isPasswordCorrect(password)

//    if (!isPasswordValid) {
//     throw new ApiError(401, "Invalid user credentials")
//     }

//    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

//     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//         new ApiResponse(
//             200, 
//             {
//                 user: loggedInUser, accessToken, refreshToken
//             },
//             "User logged In Successfully"
//         )
//     )

// })

// const logoutUser = asyncHandler(async(req, res) => {
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $unset: {
//                 refreshToken: 1 // this removes the field from document
//             }
//         },
//         {
//             new: true
//         }
//     )

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User logged Out"))
// })

// const refreshAccessToken = asyncHandler(async (req, res) => {
//     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

//     if (!incomingRefreshToken) {
//         throw new ApiError(401, "unauthorized request")
//     }

//     try {
//         const decodedToken = jwt.verify(
//             incomingRefreshToken,
//             process.env.REFRESH_TOKEN_SECRET
//         )
    
//         const user = await User.findById(decodedToken?._id)
    
//         if (!user) {
//             throw new ApiError(401, "Invalid refresh token")
//         }
    
//         if (incomingRefreshToken !== user?.refreshToken) {
//             throw new ApiError(401, "Refresh token is expired or used")
            
//         }
    
//         const options = {
//             httpOnly: true,
//             secure: true
//         }
    
//         const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
//         return res
//         .status(200)
//         .cookie("accessToken", accessToken, options)
//         .cookie("refreshToken", newRefreshToken, options)
//         .json(
//             new ApiResponse(
//                 200, 
//                 {accessToken, refreshToken: newRefreshToken},
//                 "Access token refreshed"
//             )
//         )
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid refresh token")
//     }

// })

// const changeCurrentPassword = asyncHandler(async(req, res) => {
//     const {oldPassword, newPassword} = req.body

    

//     const user = await User.findById(req.user?._id)
//     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

//     if (!isPasswordCorrect) {
//         throw new ApiError(400, "Invalid old password")
//     }

//     user.password = newPassword
//     await user.save({validateBeforeSave: false})

//     return res
//     .status(200)
//     .json(new ApiResponse(200, {}, "Password changed successfully"))
// })


// const getCurrentUser = asyncHandler(async(req, res) => {
//     return res
//     .status(200)
//     .json(new ApiResponse(
//         200,
//         req.user,
//         "User fetched successfully"
//     ))
// })

// const updateAccountDetails = asyncHandler(async(req, res) => {
//     const {fullName, email} = req.body

//     if (!fullName || !email) {
//         throw new ApiError(400, "All fields are required")
//     }

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set: {
//                 fullName,
//                 email: email
//             }
//         },
//         {new: true}
        
//     ).select("-password")

//     return res
//     .status(200)
//     .json(new ApiResponse(200, user, "Account details updated successfully"))
// });

// const updateUserAvatar = asyncHandler(async(req, res) => {
//     const avatarLocalPath = req.file?.path

//     if (!avatarLocalPath) {
//         throw new ApiError(400, "Avatar file is missing")
//     }

//     //TODO: delete old image - assignment

//     const avatar = await uploadOnCloudinary(avatarLocalPath)

//     if (!avatar.url) {
//         throw new ApiError(400, "Error while uploading on avatar")
        
//     }

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set:{
//                 avatar: avatar.url
//             }
//         },
//         {new: true}
//     ).select("-password")

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, user, "Avatar image updated successfully")
//     )
// })

// const updateUserCoverImage = asyncHandler(async(req, res) => {
//     const coverImageLocalPath = req.file?.path

//     if (!coverImageLocalPath) {
//         throw new ApiError(400, "Cover image file is missing")
//     }

//     //TODO: delete old image - assignment


//     const coverImage = await uploadOnCloudinary(coverImageLocalPath)

//     if (!coverImage.url) {
//         throw new ApiError(400, "Error while uploading on avatar")
        
//     }

//     const user = await User.findByIdAndUpdate(
//         req.user?._id,
//         {
//             $set:{
//                 coverImage: coverImage.url
//             }
//         },
//         {new: true}
//     ).select("-password")

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, user, "Cover image updated successfully")
//     )
// })


// const getUserChannelProfile = asyncHandler(async(req, res) => {
//     const {username} = req.params

//     if (!username?.trim()) {
//         throw new ApiError(400, "username is missing")
//     }

//     const channel = await User.aggregate([
//         {
//             $match: {
//                 username: username?.toLowerCase()
//             }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "channel",
//                 as: "subscribers"
//             }
//         },
//         {
//             $lookup: {
//                 from: "subscriptions",
//                 localField: "_id",
//                 foreignField: "subscriber",
//                 as: "subscribedTo"
//             }
//         },
//         {
//             $addFields: {
//                 subscribersCount: {
//                     $size: "$subscribers"
//                 },
//                 channelsSubscribedToCount: {
//                     $size: "$subscribedTo"
//                 },
//                 isSubscribed: {
//                     $cond: {
//                         if: {$in: [req.user?._id, "$subscribers.subscriber"]},
//                         then: true,
//                         else: false
//                     }
//                 }
//             }
//         },
//         {
//             $project: {
//                 fullName: 1,
//                 username: 1,
//                 subscribersCount: 1,
//                 channelsSubscribedToCount: 1,
//                 isSubscribed: 1,
//                 avatar: 1,
//                 coverImage: 1,
//                 email: 1

//             }
//         }
//     ])

//     if (!channel?.length) {
//         throw new ApiError(404, "channel does not exists")
//     }

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(200, channel[0], "User channel fetched successfully")
//     )
// })

// const getWatchHistory = asyncHandler(async(req, res) => {
//     const user = await User.aggregate([
//         {
//             $match: {
//                 _id: new mongoose.Types.ObjectId(req.user._id)
//             }
//         },
//         {
//             $lookup: {
//                 from: "videos",
//                 localField: "watchHistory",
//                 foreignField: "_id",
//                 as: "watchHistory",
//                 pipeline: [
//                     {
//                         $lookup: {
//                             from: "users",
//                             localField: "owner",
//                             foreignField: "_id",
//                             as: "owner",
//                             pipeline: [
//                                 {
//                                     $project: {
//                                         fullName: 1,
//                                         username: 1,
//                                         avatar: 1
//                                     }
//                                 }
//                             ]
//                         }
//                     },
//                     {
//                         $addFields:{
//                             owner:{
//                                 $first: "$owner"
//                             }
//                         }
//                     }
//                 ]
//             }
//         }
//     ])

//     return res
//     .status(200)
//     .json(
//         new ApiResponse(
//             200,
//             user[0].watchHistory,
//             "Watch history fetched successfully"
//         )
//     )
// })


// export {
//     registerUser,
//     loginUser,
//     logoutUser,
//     refreshAccessToken,
//     changeCurrentPassword,
//     getCurrentUser,
//     updateAccountDetails,
//     updateUserAvatar,
//     updateUserCoverImage,
//     getUserChannelProfile,
//     getWatchHistory
// }