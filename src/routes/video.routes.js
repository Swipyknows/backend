import {Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
} from "../controllers/video.controller.js"
const videoRouter = Router()
videoRouter.route("/").get(getAllVideos).post(verifyJWT, publishAVideo)
videoRouter.route("/:videoId").get(getVideoById).patch(verifyJWT, updateVideo).delete(verifyJWT, deleteVideo)
videoRouter.route("/:videoId/toggle_publish").patch(verifyJWT, togglePublishStatus)

export default videoRouter