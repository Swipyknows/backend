import {asynchandler} from "../utils/asynchandler.js"
import {ApiError} from "../utils/apierror.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {Response} from "../utils/apiresponse.js"
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
    .cookie("accessToken",options)
    .cookie("refreshToken",options)
    .json(
        new Response(200,null,"Logout successful")
    )
})
export {registerUser,loginuser,logoutUser};