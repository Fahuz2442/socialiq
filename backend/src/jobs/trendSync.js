import { Queue, Worker } from 'bullmq';
import { createClient } from 'redis';
import { db } from '../db/client.js';
import { fetchAllTrends } from '../services/trendService.js';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// ─── Queue ────────────────────────────────────────────────────
export const trendQueue = new Queue('trend-sync', { connection });

// ─── Schedule hourly sync for all users ───────────────────────
export async function scheduleTrendSync() {
  await trendQueue.add(
    'sync-all-users',
    {},
    {
      repeat: { every: 60 * 60 * 1000 }, // every 1 hour
      removeOnComplete: 10,
      removeOnFail: 5,
    }
  );
  console.log('Trend sync job scheduled (every 1 hour)');
}

// ─── Worker ───────────────────────────────────────────────────
export function startTrendWorker() {
  const worker = new Worker(
    'trend-sync',
    async (job) => {
      console.log('Running trend sync job...');

      const { rows: users } = await db.query(
        'SELECT DISTINCT user_id FROM platform_tokens'
      );

      const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
      await redis.connect();

      for (const { user_id } of users) {
        try {
          const trends = await fetchAllTrends(user_id);

          // Store in Redis with 2 hour expiry
          await redis.setEx(
            `trends:${user_id}`,
            7200,
            JSON.stringify(trends)
          );

          console.log(`Trends synced for user ${user_id}`);
        } catch (err) {
          console.error(`Trend sync failed for user ${user_id}:`, err.message);
        }
      }

      await redis.disconnect();
    },
    { connection }
  );

  worker.on('completed', (job) => console.log(`Trend job ${job.id} completed`));
  worker.on('failed', (job, err) => console.error(`Trend job ${job.id} failed:`, err.message));

  return worker;
}
