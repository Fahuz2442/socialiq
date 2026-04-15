import { Router } from 'express';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateAllScores, calculateMemberScore } from '../services/kpiService.js';

const router = Router();

// ─── GET /api/team ────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { rows: members } = await db.query(
    `SELECT m.*,
       ks.total_score, ks.engagement_rate, ks.reach_growth,
       ks.consistency, ks.innovation, ks.timeliness,
       ks.posts_count, ks.total_likes, ks.total_reach,
       ks.week_start
     FROM team_members m
     LEFT JOIN LATERAL (
       SELECT * FROM kpi_scores
       WHERE member_id = m.id
       ORDER BY week_start DESC LIMIT 1
     ) ks ON true
     WHERE m.owner_id = $1
     ORDER BY COALESCE(ks.total_score, 0) DESC`,
    [req.user.id]
  );
  res.json({ members });
});

// ─── POST /api/team ───────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { name, email, role, platforms, avatarColor } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email are required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO team_members (owner_id, name, email, role, platforms, avatar_color)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, email, role || 'member', platforms || [], avatarColor || '#818cf8']
    );
    res.status(201).json({ member: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A member with this email already exists' });
    }
    throw err;
  }
});

// ─── PUT /api/team/:id ────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const { name, email, role, platforms, avatarColor } = req.body;
  const { rows } = await db.query(
    `UPDATE team_members
     SET name = $1, email = $2, role = $3, platforms = $4, avatar_color = $5
     WHERE id = $6 AND owner_id = $7 RETURNING *`,
    [name, email, role, platforms || [], avatarColor, req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Member not found' });
  res.json({ member: rows[0] });
});

// ─── DELETE /api/team/:id ─────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  await db.query(
    'DELETE FROM team_members WHERE id = $1 AND owner_id = $2',
    [req.params.id, req.user.id]
  );
  res.json({ success: true });
});

// ─── GET /api/team/:id/history ────────────────────────────────
router.get('/:id/history', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    `SELECT * FROM kpi_scores
     WHERE member_id = $1 AND owner_id = $2
     ORDER BY week_start DESC LIMIT 12`,
    [req.params.id, req.user.id]
  );
  res.json({ history: rows });
});

// ─── POST /api/team/calculate ─────────────────────────────────
router.post('/calculate', requireAuth, async (req, res) => {
  const results = await calculateAllScores(req.user.id);
  res.json({ success: true, results: results.length });
});

export default router;
