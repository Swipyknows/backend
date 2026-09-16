import { redisClient } from "../db/redis.js";

export const cacheMiddleware = (keyPrefix, ttlSeconds = 60) => {
    return async (req, res, next) => {
        const cacheKey = `${keyPrefix}:${req.originalUrl}`;
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return res.json(JSON.parse(cached));
            }
        } catch (err) {
            console.error("Cache read error:", err); // fail open, don't block request
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            redisClient.set(cacheKey, JSON.stringify(body), 'EX', ttlSeconds).catch(console.error);
            return originalJson(body);
        };
        next();
    };
};