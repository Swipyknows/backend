import { Queue } from "bullmq";
import { redisClient } from "../db/redis.js";

export const videoEmbeddingQueue = new Queue("video-embeddings", {
    connection: redisClient
});

export const userInterestQueue = new Queue("user-interests", {
    connection: redisClient
});

/**
 * Helper to add a video embedding task to the queue
 * @param {string} videoId 
 */
export const queueVideoEmbeddingJob = async (videoId) => {
    try {
        await videoEmbeddingQueue.add("generate-video-embedding", { videoId }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: true
        });
    } catch (error) {
        console.error("Failed to queue video embedding job:", error.message);
    }
};

/**
 * Helper to add a user interest recalculation task to the queue
 * @param {string} userId 
 */
export const queueUserInterestJob = async (userId) => {
    try {
        await userInterestQueue.add("update-user-interest", { userId }, {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: true
        });
    } catch (error) {
        console.error("Failed to queue user interest job:", error.message);
    }
};
