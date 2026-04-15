import axios from 'axios';
import { db } from '../db/client.js';
import { getToken } from './tokenStore.js';

const GRAPH = 'https://graph.instagram.com';
const YT    = 'https://www.googleapis.com/youtube/v3';

// ─── Instagram competitor sync ────────────────────────────────
async function syncInstagramCompetitor(competitor, userId) {
  const token = await getToken(userId, 'instagram');
  if (!token) throw new Error('Instagram not connected');

  try {
    const { data: search } = await axios.get(`${GRAPH}/ig_hashtag_search`, {
      params: {
        user_id: token.platform_user_id,
        q: competitor.handle.replace('@', ''),
        access_token: token.accessToken,
      },
    });

    const hashtagId = search.data?.[0]?.id;
    if (!hashtagId) return null;

    const { data: recent } = await axios.get(`${GRAPH}/${hashtagId}/recent_media`, {
      params: {
        user_id: token.platform_user_id,
        fields: 'id,caption,like_count,comments_count,timestamp,permalink',
        access_token: token.accessToken,
      },
    });

    const posts = recent.data || [];
    const avgLikes    = posts.reduce((s, p) => s + (p.like_count    || 0), 0) / (posts.length || 1);
    const avgComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0) / (posts.length || 1);

    await db.query(
      `UPDATE competitors SET
         avg_likes = $1, avg_comments = $2,
         total_posts = $3, last_synced_at = NOW()
       WHERE id = $4`,
      [avgLikes.toFixed(2), avgComments.toFixed(2), posts.length, competitor.id]
    );

    for (const post of posts) {
      await db.query(
        `INSERT INTO competitor_posts
           (competitor_id, platform_post_id, caption, permalink, likes, comments, posted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (competitor_id, platform_post_id) DO UPDATE SET
           likes = EXCLUDED.likes, comments = EXCLUDED.comments`,
        [competitor.id, post.id, post.caption, post.permalink,
         post.like_count, post.comments_count, post.timestamp]
      );
    }

    return { posts: posts.length };
  } catch (err) {
    console.warn(`Instagram competitor sync failed for ${competitor.handle}:`, err.message);
    return null;
  }
}

// ─── YouTube competitor sync ──────────────────────────────────
async function syncYoutubeCompetitor(competitor, userId) {
  const token = await getToken(userId, 'youtube');
  if (!token) throw new Error('YouTube not connected');

  try {
    const { data: search } = await axios.get(`${YT}/search`, {
      params: {
        part: 'snippet',
        q: competitor.handle,
        type: 'channel',
        maxResults: 1,
      },
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    const channel = search.items?.[0];
    if (!channel) return null;

    const channelId = channel.id.channelId;

    const { data: stats } = await axios.get(`${YT}/channels`, {
      params: { part: 'statistics,snippet', id: channelId },
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    const s = stats.items?.[0]?.statistics || {};

    await db.query(
      `UPDATE competitors SET
         followers = $1, total_posts = $2,
         avatar_url = $3, last_synced_at = NOW()
       WHERE id = $4`,
      [
        parseInt(s.subscriberCount || 0),
        parseInt(s.videoCount      || 0),
        channel.snippet?.thumbnails?.default?.url,
        competitor.id,
      ]
    );

    const { data: videos } = await axios.get(`${YT}/search`, {
      params: {
        part: 'snippet',
        channelId,
        type: 'video',
        maxResults: 10,
        order: 'date',
      },
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    for (const video of videos.items || []) {
      await db.query(
        `INSERT INTO competitor_posts
           (competitor_id, platform_post_id, caption, permalink, posted_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (competitor_id, platform_post_id) DO NOTHING`,
        [
          competitor.id,
          video.id.videoId,
          video.snippet.title,
          `https://youtube.com/watch?v=${video.id.videoId}`,
          video.snippet.publishedAt,
        ]
      );
    }

    return { posts: videos.items?.length || 0 };
  } catch (err) {
    console.warn(`YouTube competitor sync failed for ${competitor.handle}:`, err.message);
    return null;
  }
}

// ─── Main sync function ───────────────────────────────────────
export async function syncCompetitor(competitorId, userId) {
  const { rows } = await db.query(
    'SELECT * FROM competitors WHERE id = $1 AND user_id = $2',
    [competitorId, userId]
  );

  if (!rows.length) throw new Error('Competitor not found');
  const competitor = rows[0];

  if (competitor.platform === 'instagram') {
    return await syncInstagramCompetitor(competitor, userId);
  } else if (competitor.platform === 'youtube') {
    return await syncYoutubeCompetitor(competitor, userId);
  }

  return null;
}
