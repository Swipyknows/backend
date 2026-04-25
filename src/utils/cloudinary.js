import {v2 as cloudinary} from 'cloudinary'
import fs from 'fs'
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const uploadOnCloudinary=async (localfilepath) => {
    try{
        if(!localfilepath) return null;
        const response=await cloudinary.uploader.upload(localfilepath,{
            resource_type:"auto"
        })
        console.log("file uploaded successfully!!",response)
        return response;
    }
    catch(error){
        await fs.promises.unlink(localfilepath).catch(err => console.error("Failed to delete temp file:", err));
        return null;
    }
}

export {uploadOnCloudinary};
