import { Router } from 'express';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { syncCompetitor } from '../services/competitorService.js';

const router = Router();

// ─── GET /api/competitors ─────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT c.*,
       COUNT(cp.id) AS synced_posts
     FROM competitors c
     LEFT JOIN competitor_posts cp ON cp.competitor_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [req.user.id]
  );
  res.json({ competitors: rows });
});

// ─── POST /api/competitors ────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { name, platform, handle } = req.body;
  if (!name || !platform || !handle) {
    return res.status(400).json({ error: 'name, platform and handle are required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO competitors (user_id, name, platform, handle)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, name, platform, handle.replace('@', '')]
    );
    res.status(201).json({ competitor: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This competitor is already being tracked' });
    }
    throw err;
  }
});

// ─── DELETE /api/competitors/:id ──────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  await db.query(
    'DELETE FROM competitors WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

// ─── POST /api/competitors/:id/sync ──────────────────────────
router.post('/:id/sync', requireAuth, async (req, res) => {
  try {
    const result = await syncCompetitor(req.params.id, req.user.id);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/competitors/:id/posts ──────────────────────────
router.get('/:id/posts', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT cp.* FROM competitor_posts cp
     JOIN competitors c ON c.id = cp.competitor_id
     WHERE cp.competitor_id = $1 AND c.user_id = $2
     ORDER BY cp.posted_at DESC LIMIT 20`,
    [req.params.id, req.user.id]
  );
  res.json({ posts: rows });
});

export default router;
