import 'dotenv/config';
import { Worker } from 'bullmq';
import { redisClient } from '../db/redis.js';

const worker = new Worker('notifications', async (job) => {
    const { type, payload } = job.data;
    switch (type) {
        case 'new_comment':
            // send email/push/in-app notification to video owner
            console.log(`Notify ${payload.videoOwner}: new comment from ${payload.commenter}`);
            break;
        case 'new_subscriber':
            console.log(`Notify ${payload.channel}: new subscriber ${payload.subscriber}`);
            break;
    }
}, { connection: redisClient });

worker.on('completed', (job) => console.log(`Job ${job.id} done`));
worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));