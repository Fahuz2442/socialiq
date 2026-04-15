import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateContentIdeas, generateCaption } from '../services/aiService.js';

const router = Router();

/**
 * Helper to validate Environment Configuration
 */
const validateConfig = (res) => {
  if (!process.env.GROQ_API_KEY) {
    console.error('Config Error: GROQ_API_KEY missing');
    res.status(500).json({ error: 'AI service not configured.' });
    return false;
  }
  return true;
};

// --- AI Content Routes ---

router.post('/ideas', requireAuth, async (req, res) => {
  if (!validateConfig(res)) return;

  try {
    const { platform, contentType, tone, topic } = req.body;
    const ideas = await generateContentIdeas({
      userId: req.user.id,
      platform,
      contentType,
      tone,
      topic,
    });
    res.json({ ideas });
  } catch (err) {
    // Detailed logging for debugging
    console.error('AI Ideas Route Error:', err.response?.data || err.message);
    res.status(500).json({ 
      error: 'Failed to generate ideas.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined 
    });
  }
});

router.post('/caption', requireAuth, async (req, res) => {
  if (!validateConfig(res)) return;

  try {
    const { hook, platform, tone } = req.body;
    const caption = await generateCaption({ hook, platform, tone });
    res.json({ caption });
  } catch (err) {
    console.error('AI Caption Route Error:', err.message);
    res.status(500).json({ error: 'Failed to generate caption.' });
  }
});

export default router;