import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const deleteLocalFile = (localfilepath) => {
    try {
        if (localfilepath && fs.existsSync(localfilepath)) {
            fs.unlinkSync(localfilepath);
        }
    } catch (err) {
        console.error("Failed to delete local temp file:", err);
    }
};

const uploadOnCloudinary = async (localfilepath, resourceType = "auto") => {
    try {
        if (!localfilepath) return null;
        // Upload the file on Cloudinary
        const response = await cloudinary.uploader.upload(localfilepath, {
            resource_type: resourceType || "auto"
        });
        console.log("File uploaded successfully to Cloudinary:", response.secure_url || response.url);
        // Delete the locally saved temporary file after successful upload
        if (fs.existsSync(localfilepath)) {
            await fs.promises.unlink(localfilepath).catch(err => console.error("Failed to delete temp file after upload:", err));
        }
        return response;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);
        // Remove the locally saved temporary file as the upload operation failed
        if (localfilepath && fs.existsSync(localfilepath)) {
            await fs.promises.unlink(localfilepath).catch(err => console.error("Failed to delete temp file on error:", err));
        }
        return null;
    }
};

export { uploadOnCloudinary, deleteLocalFile };

