import {Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {likeVideoOrComment} from "../controllers/like.controller.js"

const likerouter = Router()
likerouter.route("/:videoId?/:commentId?")
.post(verifyJWT, likeVideoOrComment)
export default likerouter