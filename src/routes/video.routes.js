import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { cacheMiddleware } from "../middlewares/cache.middleware.js"
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
videoRouter.route("/").post(verifyJWT, publishAVideo)
videoRouter.route("/:videoId").patch(verifyJWT, updateVideo).delete(verifyJWT, deleteVideo)
videoRouter.route("/:videoId/toggle_publish").patch(verifyJWT, togglePublishStatus)
videoRouter.route("/upload").post(
    verifyJWT,
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]),
    uploadVideo
)

videoRouter.get("/", cacheMiddleware("videos_list", 30), getAllVideos);
videoRouter.get("/:videoId", cacheMiddleware("video_detail", 120), getVideoById);
export default videoRouter