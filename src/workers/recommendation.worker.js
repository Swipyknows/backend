import { Worker } from "bullmq";
import { redisClient } from "../db/redis.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { generateEmbedding, aggregateUserInterestVector } from "../utils/embedding.service.js";
import { invalidatePattern } from "../utils/cache.invalidate.js";

// Worker for video text embedding generation
export const videoEmbeddingWorker = new Worker(
    "video-embeddings",
    async (job) => {
        const { videoId } = job.data;
        if (!videoId) return;

        console.log(`Processing video embedding for videoId: ${videoId}`);
        const video = await Video.findById(videoId);
        if (!video) {
            console.warn(`Video ${videoId} not found for embedding generation.`);
            return;
        }

        const tagsText = Array.isArray(video.tags) ? video.tags.join(" ") : "";
        const fullText = `${video.title || ""} ${video.description || ""} ${tagsText}`.trim();

        if (!fullText) return;

        const vector = await generateEmbedding(fullText);
        if (vector && vector.length > 0) {
            video.descriptionVector = vector;
            await video.save();
            console.log(`Successfully generated ${vector.length}-d embedding for video ${videoId}`);

            // Invalidate recommendation caches in Redis
            invalidatePattern("rec:*");
        }
    },
    { connection: redisClient }
);

// Worker for updating user preference vectors
export const userInterestWorker = new Worker(
    "user-interests",
    async (job) => {
        const { userId } = job.data;
        if (!userId) return;

        console.log(`Updating user interest vector for userId: ${userId}`);
        const user = await User.findById(userId).populate({
            path: "watchhistory",
            select: "descriptionVector createdAt",
            options: { limit: 20, sort: { createdAt: -1 } }
        });

        if (!user) return;

        // Fetch liked videos as well
        const userLikes = await Like.find({ likedby: userId, video: { $exists: true } })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate({ path: "video", select: "descriptionVector" });

        const watchedVectors = (user.watchhistory || [])
            .map((v) => v.descriptionVector)
            .filter((vec) => Array.isArray(vec) && vec.length > 0);

        const likedVectors = userLikes
            .map((l) => l.video?.descriptionVector)
            .filter((vec) => Array.isArray(vec) && vec.length > 0);

        // Combine vectors (giving liked videos extra weight by repeating or prioritizing)
        const combinedVectors = [...watchedVectors, ...likedVectors];

        if (combinedVectors.length > 0) {
            const aggregatedVector = aggregateUserInterestVector(combinedVectors);
            if (aggregatedVector.length > 0) {
                user.interestVector = aggregatedVector;
                user.lastVectorUpdate = new Date();
                await user.save();
                console.log(`Updated interest vector (${aggregatedVector.length}-d) for user ${userId}`);

                // Invalidate specific user cache
                invalidatePattern(`rec:user:${userId}:*`);
            }
        }
    },
    { connection: redisClient }
);

videoEmbeddingWorker.on("failed", (job, err) => {
    console.error(`Video embedding worker failed for job ${job?.id}:`, err);
});

userInterestWorker.on("failed", (job, err) => {
    console.error(`User interest worker failed for job ${job?.id}:`, err);
});
