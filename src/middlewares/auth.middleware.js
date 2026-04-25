import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import {ApiError} from "../utils/apierror.js";

export const verifyJWT=asynchandler(async(req,res,next)=>{
    try{
        const token = req.cookies?.accessToken || req.header?.("Authorization")?.replace("Bearer ","")
        if(!token){
            throw new ApiError(401,"Unauthorized!! No token provided")
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const user = await User.findById(decodedToken.id).select("-password -refreshToken")
        if(!user){
            throw new ApiError(401,"Unauthorized!! Invalid token")
        }
        req.user = user
        next()
    }
    catch(error){
        throw new ApiError(401,error?.message ||"Unauthorized!! Invalid token")
    }
})