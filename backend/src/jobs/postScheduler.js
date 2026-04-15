import { Queue, Worker } from 'bullmq';
import { db } from '../db/client.js';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const schedulerQueue = new Queue('post-scheduler', { connection });

// ─── Schedule a post job ──────────────────────────────────────
export async function schedulePost(postId, scheduledAt) {
  const delay = new Date(scheduledAt).getTime() - Date.now();

  if (delay < 0) {
    throw new Error('Scheduled time must be in the future');
  }

  const job = await schedulerQueue.add(
    'publish-post',
    { postId },
    {
      delay,
      removeOnComplete: 20,
      removeOnFail: 10,
    }
  );

  await db.query(
    'UPDATE scheduled_posts SET job_id = $1 WHERE id = $2',
    [job.id, postId]
  );

  return job.id;
}

// ─── Cancel a scheduled post ──────────────────────────────────
export async function cancelPost(jobId) {
  try {
    const job = await schedulerQueue.getJob(jobId);
    if (job) await job.remove();
  } catch (err) {
    console.warn('Could not remove job:', err.message);
  }
}

// ─── Worker that publishes posts ──────────────────────────────
export function startSchedulerWorker() {
  const worker = new Worker(
    'post-scheduler',
    async (job) => {
      const { postId } = job.data;
      console.log(`Publishing scheduled post ${postId}...`);

      const { rows } = await db.query(
        'SELECT * FROM scheduled_posts WHERE id = $1',
        [postId]
      );

      if (!rows.length) {
        throw new Error(`Scheduled post ${postId} not found`);
      }

      const post = rows[0];

      // Mark as published (actual platform publishing comes in Phase 5b)
      await db.query(
        `UPDATE scheduled_posts
         SET status = 'published', published_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [postId]
      );

      console.log(`Post ${postId} published on ${post.platform}`);
    },
    { connection }
  );

  worker.on('completed', (job) => {
    console.log(`Scheduler job ${job.id} completed`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`Scheduler job ${job.id} failed:`, err.message);
    if (job?.data?.postId) {
      await db.query(
        `UPDATE scheduled_posts
         SET status = 'failed', error_message = $1, updated_at = NOW()
         WHERE id = $2`,
        [err.message, job.data.postId]
      );
    }
  });

  return worker;
}
