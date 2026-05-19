import {Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {likeVideoOrComment} from "../controllers/like.controller.js"

const likerouter = Router()
likerouter.route("/:videoId").post(verifyJWT, likeVideoOrComment)
likerouter.route("/:commentId").post(verifyJWT, likeVideoOrComment)
likerouter.route("/").post(verifyJWT, likeVideoOrComment)
// Access via: req.query.videoId or req.query.commentId
export default likerouter