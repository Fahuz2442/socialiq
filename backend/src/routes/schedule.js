import { Router } from 'express';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { schedulePost, cancelPost } from '../jobs/postScheduler.js';

const router = Router();

// ─── GET /api/schedule ────────────────────────────────────────
// List all scheduled posts for the user
router.get('/', requireAuth, async (req, res) => {
  const { status, from, to } = req.query;

  let query = `
    SELECT * FROM scheduled_posts
    WHERE user_id = $1
  `;
  const params = [req.user.id];

  if (status) {
    query += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  if (from) {
    query += ` AND scheduled_at >= $${params.length + 1}`;
    params.push(from);
  }

  if (to) {
    query += ` AND scheduled_at <= $${params.length + 1}`;
    params.push(to);
  }

  query += ' ORDER BY scheduled_at ASC';

  const { rows } = await db.query(query, params);
  res.json({ posts: rows });
});

// ─── POST /api/schedule ───────────────────────────────────────
// Create a new scheduled post
router.post('/', requireAuth, async (req, res) => {
  const { platform, caption, hashtags, scheduledAt, mediaUrl } = req.body;

  if (!platform || !caption || !scheduledAt) {
    return res.status(400).json({ error: 'platform, caption and scheduledAt are required' });
  }

  if (new Date(scheduledAt) < new Date()) {
    return res.status(400).json({ error: 'Scheduled time must be in the future' });
  }

  const { rows } = await db.query(
    `INSERT INTO scheduled_posts
       (user_id, platform, caption, hashtags, scheduled_at, media_url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [req.user.id, platform, caption, hashtags || [], scheduledAt, mediaUrl || null]
  );

  const post = rows[0];

  try {
    const jobId = await schedulePost(post.id, scheduledAt);
    res.status(201).json({ post: { ...post, job_id: jobId } });
  } catch (err) {
    await db.query('DELETE FROM scheduled_posts WHERE id = $1', [post.id]);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/schedule/:id ────────────────────────────────────
// Update a scheduled post
router.put('/:id', requireAuth, async (req, res) => {
  const { caption, hashtags, scheduledAt, mediaUrl } = req.body;

  const { rows } = await db.query(
    'SELECT * FROM scheduled_posts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Post not found' });

  const post = rows[0];
  if (post.status !== 'pending') {
    return res.status(400).json({ error: 'Only pending posts can be edited' });
  }

  if (post.job_id) await cancelPost(post.job_id);

  const { rows: updated } = await db.query(
    `UPDATE scheduled_posts
     SET caption = $1, hashtags = $2, scheduled_at = $3,
         media_url = $4, updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [caption, hashtags || [], scheduledAt, mediaUrl || null, post.id]
  );

  await schedulePost(post.id, scheduledAt);
  res.json({ post: updated[0] });
});

// ─── DELETE /api/schedule/:id ─────────────────────────────────
// Cancel a scheduled post
router.delete('/:id', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM scheduled_posts WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );

  if (!rows.length) return res.status(404).json({ error: 'Post not found' });

  const post = rows[0];
  if (post.job_id) await cancelPost(post.job_id);

  await db.query(
    `UPDATE scheduled_posts SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
    [post.id]
  );

  res.json({ success: true });
});

export default router;
