import { redisClient } from "../db/redis.js";

export async function invalidatePattern(pattern) {
    const stream = redisClient.scanStream({ match: pattern });
    stream.on('data', (keys) => {
        if (keys.length) redisClient.unlink(keys);
    });
}