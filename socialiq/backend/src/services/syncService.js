import { db } from '../db/client.js';
import { getConnectedPlatforms } from './tokenStore.js';
import * as instagram from './instagram.js';
import * as youtube from './youtube.js';
import * as linkedin from './linkedin.js';
import * as twitter from './twitter.js';
import * as facebook from './facebook.js';

const SERVICES = { instagram, youtube, linkedin, twitter, facebook };

/**
 * Sync all posts + latest metrics for every connected platform of a user.
 * Returns a summary of what was synced.
 */
export async function syncAllPlatforms(userId) {
  const platforms = await getConnectedPlatforms(userId);
  const results = {};

  for (const { platform } of platforms) {
    const svc = SERVICES[platform];
    if (!svc) continue;

    try {
      const postCount = await svc.syncPosts(userId);
      results[platform] = { posts: postCount, error: null };

      // Now fetch metrics for each recently synced post
      await syncMetricsForPlatform(userId, platform, svc);
    } catch (err) {
      console.error(`Sync failed for ${platform}:`, err.message);
      results[platform] = { posts: 0, error: err.message };
    }
  }

  return results;
}

async function syncMetricsForPlatform(userId, platform, svc) {
  if (!svc.fetchPostMetrics) return;

  const { rows: posts } = await db.query(
    `SELECT id, platform_post_id FROM posts
     WHERE user_id = $1 AND platform = $2
     ORDER BY posted_at DESC LIMIT 25`,
    [userId, platform]
  );

  for (const post of posts) {
    try {
      const m = await svc.fetchPostMetrics(userId, post.platform_post_id);

      const engagementRate = m.reach > 0
        ? ((m.likes + m.comments + m.shares) / m.reach).toFixed(4)
        : 0;

      await db.query(
        `INSERT INTO post_metrics
           (post_id, user_id, platform, likes, comments, shares, saves,
            reach, impressions, video_views, engagement_rate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          post.id, userId, platform,
          m.likes, m.comments, m.shares, m.saves,
          m.reach, m.impressions, m.video_views || 0, engagementRate,
        ]
      );
    } catch (err) {
      // Some posts may have metrics unavailable — skip silently
      console.warn(`Metrics fetch skipped for post ${post.platform_post_id}: ${err.message}`);
    }
  }
}
