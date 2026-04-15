import axios from 'axios';
import { db } from '../db/client.js';
import { createClient } from 'redis';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

async function getTopPosts(userId, limit = 10) {
  const { rows } = await db.query(
    `SELECT p.caption, p.platform, p.content_type,
            pm.likes, pm.comments, pm.shares, pm.engagement_rate
     FROM posts p
     JOIN LATERAL (
       SELECT * FROM post_metrics
       WHERE post_id = p.id
       ORDER BY recorded_at DESC LIMIT 1
     ) pm ON true
     WHERE p.user_id = $1 AND p.caption IS NOT NULL
     ORDER BY pm.engagement_rate DESC NULLS LAST
     LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

async function getCachedTrends(userId) {
  try {
    const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await redis.connect();
    const cached = await redis.get(`trends:${userId}`);
    await redis.disconnect();
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('Redis trends fetch failed:', err.message);
  }
  return null;
}

async function callGroq(prompt) {
  try {
    const response = await axios.post(
      GROQ_API,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
        temperature: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.choices[0].message.content;
  } catch (err) {
    console.error('Groq API error:', err.response?.status);
    console.error('Groq API data:', JSON.stringify(err.response?.data));
    throw err;
  }
}

export async function generateContentIdeas({ userId, platform, contentType, tone, topic }) {
  const [topPosts, trends] = await Promise.all([
    getTopPosts(userId),
    getCachedTrends(userId),
  ]);

  const topHashtags = trends
    ? [
        ...(trends.instagram || []).slice(0, 5).map((t) => t.tag),
        ...(trends.twitter   || []).slice(0, 5).map((t) => t.tag),
      ].join(', ')
    : 'no trend data available';

  const topPostSummary = topPosts.length
    ? topPosts.slice(0, 5).map((p, i) =>
        `${i + 1}. [${p.platform}] "${p.caption?.slice(0, 100)}..." — ${p.likes} likes, ${(p.engagement_rate * 100).toFixed(1)}% engagement`
      ).join('\n')
    : 'No historical post data available yet.';

  const prompt = `You are a social media content strategist.

CONTEXT:
- Target platform: ${platform || 'Instagram'}
- Content type: ${contentType || 'post'}
- Desired tone: ${tone || 'engaging and professional'}
- Topic/niche: ${topic || 'general content'}

TOP PERFORMING POSTS (for style reference):
${topPostSummary}

CURRENTLY TRENDING HASHTAGS:
${topHashtags}

TASK:
Generate 5 content ideas optimized for ${platform || 'Instagram'}. For each idea provide:
1. A scroll-stopping hook
2. A full caption (150-300 words)
3. A call to action
4. 10 relevant hashtags
5. Best time to post
6. Content format recommendation

Format your response as a JSON array:
[
  {
    "id": 1,
    "hook": "...",
    "caption": "...",
    "cta": "...",
    "hashtags": ["#tag1", "#tag2"],
    "bestTime": "...",
    "format": "...",
    "estimatedReach": "low|medium|high"
  }
]

Return ONLY the JSON array, no other text, no markdown backticks.`;

  const text = await callGroq(prompt);

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [{
      id: 1,
      hook: 'Could not parse AI response',
      caption: text,
      hashtags: [],
      cta: '',
      bestTime: '',
      format: '',
      estimatedReach: 'medium',
    }];
  }
}

export async function generateCaption({ hook, platform, tone }) {
  const prompt = `Write a compelling social media caption for ${platform || 'Instagram'}.
Hook: "${hook}"
Tone: ${tone || 'engaging'}
Length: 100-200 words
Include a call to action at the end.
Return only the caption text, nothing else.`;

  return await callGroq(prompt);
}