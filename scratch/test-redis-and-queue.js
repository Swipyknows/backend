import 'dotenv/config';
import { redisClient } from '../src/db/redis.js';
import { notificationQueue } from '../src/queues/notification.queue.js';
import { Worker } from 'bullmq';

async function testUpstashAndBullMQ() {
    console.log('--- Step 1: Testing Redis Cache (Set / Get / Delete) ---');
    
    // Set a cache key
    await redisClient.set('videos_list:page_1', JSON.stringify([{ id: 1, title: 'Demo Video' }]));
    console.log('✅ Created cache key: videos_list:page_1');

    // Read cache key
    const cachedData = await redisClient.get('videos_list:page_1');
    console.log('✅ Read cache key videos_list:page_1 ->', JSON.parse(cachedData));

    // Delete cache key
    await redisClient.del('videos_list:page_1');
    console.log('✅ Deleted cache key videos_list:page_1 successfully');

    console.log('\n--- Step 2: Testing BullMQ Queue & Worker ---');

    // Create worker to listen
    let workerFinished = false;
    const worker = new Worker('notifications', async (job) => {
        console.log(`🎉 [Worker Received Job] Type: "${job.data.type}", Payload:`, job.data.payload);
        workerFinished = true;
    }, { connection: redisClient });

    // Add job to queue
    console.log('📤 Sending "new_comment" job to BullMQ notifications queue...');
    await notificationQueue.add('new_comment', {
        type: 'new_comment',
        payload: {
            videoId: 'v123',
            videoOwner: 'john_doe',
            commenter: 'prajwal'
        }
    });

    // Wait for worker to finish
    await new Promise((resolve) => {
        const interval = setInterval(() => {
            if (workerFinished) {
                clearInterval(interval);
                resolve();
            }
        }, 200);
    });

    await worker.close();
    await redisClient.quit();
    console.log('\n✅ ALL TESTS PASSED SUCCESSFULLY! Upstash Redis & BullMQ Queue are fully working!');
    process.exit(0);
}

testUpstashAndBullMQ().catch((err) => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});
