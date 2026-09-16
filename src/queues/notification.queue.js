import { Queue } from 'bullmq';
import { redisClient } from '../db/redis.js';

export const notificationQueue = new Queue('notifications', {
    connection: redisClient
});