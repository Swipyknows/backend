import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getPersonalizedRecommendations,
    getSimilarVideos
} from "../controllers/recommendation.controller.js";

const recommendationRouter = Router();

// Personalized recommendations feed (requires auth)
recommendationRouter.route("/personalized").get(verifyJWT, getPersonalizedRecommendations);

// Similar videos ("Up Next") feed
recommendationRouter.route("/similar/:videoId").get(getSimilarVideos);

export default recommendationRouter;
