import {Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    uploadVideo
} from "../controllers/video.controller.js"
const videoRouter = Router()
videoRouter.route("/").get(getAllVideos).post(verifyJWT, publishAVideo)
videoRouter.route("/:videoId").get(getVideoById).patch(verifyJWT, updateVideo).delete(verifyJWT, deleteVideo)
videoRouter.route("/:videoId/toggle_publish").patch(verifyJWT, togglePublishStatus)
videoRouter.route("/upload").post(
    verifyJWT, 
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]), 
    uploadVideo
)
export default videoRouter