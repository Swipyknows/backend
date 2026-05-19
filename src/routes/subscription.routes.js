import {Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { subscribeOrUnsubscribe } from "../controllers/subcription.controller.js"
const subscriptionRouter =Router()
subscriptionRouter.route("/:channelId").post(verifyJWT, subscribeOrUnsubscribe)
export default subscriptionRouter