import { Router } from 'express';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { syncAllPlatforms } from '../services/syncService.js';

const router = Router();

// ─── GET /api/posts ───────────────────────────────────────────
// List posts with latest metrics for the logged-in user
router.get('/', requireAuth, async (req, res) => {
  const { platform, limit = 25, offset = 0 } = req.query;

  let query = `
    SELECT
      p.id, p.platform, p.platform_post_id, p.content_type,
      p.caption, p.media_url, p.permalink, p.posted_at, p.synced_at,
      pm.likes, pm.comments, pm.shares, pm.saves,
      pm.reach, pm.impressions, pm.video_views, pm.engagement_rate,
      pm.recorded_at AS metrics_at
    FROM posts p
    LEFT JOIN LATERAL (
      SELECT * FROM post_metrics
      WHERE post_id = p.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) pm ON true
    WHERE p.user_id = $1
  `;
  const params = [req.user.id];

  if (platform) {
    query += ` AND p.platform = $${params.length + 1}`;
    params.push(platform);
  }

  query += ` ORDER BY p.posted_at DESC NULLS LAST
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(parseInt(limit), parseInt(offset));

  const { rows } = await db.query(query, params);
  res.json({ posts: rows });
});

// ─── GET /api/posts/:id ───────────────────────────────────────
// Single post with full metrics history
router.get('/:id', requireAuth, async (req, res) => {
  const { rows: post } = await db.query(
    'SELECT * FROM posts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (!post.length) return res.status(404).json({ error: 'Post not found' });

  const { rows: metrics } = await db.query(
    `SELECT * FROM post_metrics
     WHERE post_id = $1
     ORDER BY recorded_at DESC LIMIT 30`,
    [req.params.id]
  );

  res.json({ post: post[0], metrics });
});

// ─── GET /api/posts/metrics/summary ──────────────────────────
// Aggregated metrics per platform for the current user
router.get('/metrics/summary', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT
       platform,
       COUNT(DISTINCT p.id)          AS total_posts,
       SUM(pm.likes)                 AS total_likes,
       SUM(pm.comments)              AS total_comments,
       SUM(pm.shares)                AS total_shares,
       SUM(pm.reach)                 AS total_reach,
       SUM(pm.impressions)           AS total_impressions,
       ROUND(AVG(pm.engagement_rate)::numeric, 4) AS avg_engagement_rate
     FROM posts p
     JOIN LATERAL (
       SELECT * FROM post_metrics
       WHERE post_id = p.id
       ORDER BY recorded_at DESC LIMIT 1
     ) pm ON true
     WHERE p.user_id = $1
     GROUP BY platform`,
    [req.user.id]
  );
  res.json({ summary: rows });
});

// ─── POST /api/posts/sync ─────────────────────────────────────
// Trigger a manual sync of all connected platforms
router.post('/sync', requireAuth, async (req, res) => {
  const results = await syncAllPlatforms(req.user.id);
  res.json({ success: true, results });
});

// ─── POST /api/posts/sync/:platform ──────────────────────────
// Sync a single platform
router.post('/sync/:platform', requireAuth, async (req, res) => {
  const { platform } = req.params;
  const { syncPosts } = await import(`../services/${platform}.js`);
  const count = await syncPosts(req.user.id);
  res.json({ success: true, platform, posts: count });
});

export default router;
