import { Router } from 'express';
import { createClient } from 'redis';
import { requireAuth } from '../middleware/auth.js';
import { fetchAllTrends } from '../services/trendService.js';
import { trendQueue } from '../jobs/trendSync.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis.connect();
    const cached = await redis.get(`trends:${userId}`);
    await redis.disconnect();

    if (cached) {
      return res.json({ trends: JSON.parse(cached), source: 'cache' });
    }

    const trends = await fetchAllTrends(userId);
    const redis2 = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis2.connect();
    await redis2.setEx(`trends:${userId}`, 7200, JSON.stringify(trends));
    await redis2.disconnect();

    res.json({ trends, source: 'fresh' });
  } catch (err) {
    console.error('Trends error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

router.post('/sync', requireAuth, async (req, res) => {
  try {
    const trends = await fetchAllTrends(req.user.id);
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis.connect();
    await redis.setEx(`trends:${req.user.id}`, 7200, JSON.stringify(trends));
    await redis.disconnect();
    res.json({ success: true, trends });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

router.get('/queue-status', requireAuth, async (req, res) => {
  const counts = await trendQueue.getJobCounts();
  res.json({ queue: counts });
});

export default router;
