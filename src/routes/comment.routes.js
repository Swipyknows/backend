import { Router } from "express"
import {
   addComment,
   getVideoComments,
   deleteComment
} from "../controllers/comment.controller.js"
import {User} from "../models/user.model.js"
import {Video} from "../models/video.model.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const commentRouter = Router()

commentRouter.route("/:videoId")
.post(verifyJWT,addComment)
.get(getVideoComments)

commentRouter.route("/:commentId")
.delete(verifyJWT,deleteComment)
export default commentRouter