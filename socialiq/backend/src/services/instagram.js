import axios from 'axios';
import { saveToken, getToken } from './tokenStore.js';
import { db } from '../db/client.js';

const BASE = 'https://api.instagram.com';
const GRAPH = 'https://graph.instagram.com';

export const instagramConfig = {
  clientId: process.env.INSTAGRAM_CLIENT_ID,
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
  redirectUri: `${process.env.BACKEND_URL}/api/auth/instagram/callback`,
  scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights'],
};

export function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: instagramConfig.clientId,
    redirect_uri: instagramConfig.redirectUri,
    scope: instagramConfig.scopes.join(','),
    response_type: 'code',
    state,
  });
  return `${BASE}/oauth/authorize?${params}`;
}

async function getShortLivedToken(code) {
  const form = new URLSearchParams({
    client_id: instagramConfig.clientId,
    client_secret: instagramConfig.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: instagramConfig.redirectUri,
    code,
  });
  const { data } = await axios.post(`${BASE}/oauth/access_token`, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

async function getLongLivedToken(shortToken) {
  const { data } = await axios.get(`${GRAPH}/access_token`, {
    params: {
      grant_type: 'ig_exchange_token',
      client_secret: instagramConfig.clientSecret,
      access_token: shortToken,
    },
  });
  return data;
}

export async function handleCallback(userId, code) {
  const short = await getShortLivedToken(code);
  const long = await getLongLivedToken(short.access_token);

  const { data: profile } = await axios.get(`${GRAPH}/me`, {
    params: { fields: 'id,username', access_token: long.access_token },
  });

  await saveToken(userId, 'instagram', {
    accessToken: long.access_token,
    tokenType: long.token_type,
    expiresIn: long.expires_in,
    scopes: instagramConfig.scopes,
    platformUserId: profile.id,
    platformUsername: profile.username,
  });

  return { username: profile.username, platformUserId: profile.id };
}

export async function syncPosts(userId) {
  const token = await getToken(userId, 'instagram');
  if (!token) throw new Error('Instagram not connected');

  const { data } = await axios.get(`${GRAPH}/me/media`, {
    params: {
      fields: 'id,caption,media_type,media_url,permalink,timestamp',
      limit: 25,
      access_token: token.accessToken,
    },
  });

  for (const post of data.data || []) {
    await db.query(
      `INSERT INTO posts (user_id, platform, platform_post_id, content_type, caption, media_url, permalink, posted_at)
       VALUES ($1, 'instagram', $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
         caption = EXCLUDED.caption, media_url = EXCLUDED.media_url, synced_at = NOW()`,
      [userId, post.id, post.media_type, post.caption, post.media_url, post.permalink, post.timestamp]
    );
  }
  return data.data?.length || 0;
}

export async function fetchPostMetrics(userId, platformPostId) {
  const token = await getToken(userId, 'instagram');
  if (!token) throw new Error('Instagram not connected');

  const { data } = await axios.get(`${GRAPH}/${platformPostId}/insights`, {
    params: {
      metric: 'likes,comments,shares,saved,reach,impressions',
      access_token: token.accessToken,
    },
  });

  const m = {};
  for (const item of data.data || []) {
    m[item.name] = item.values?.[0]?.value ?? 0;
  }

  return {
    likes: m.likes || 0,
    comments: m.comments || 0,
    shares: m.shares || 0,
    saves: m.saved || 0,
    reach: m.reach || 0,
    impressions: m.impressions || 0,
  };
}

export async function refreshToken(userId) {
  const token = await getToken(userId, 'instagram');
  if (!token) throw new Error('Instagram not connected');

  const { data } = await axios.get(`${GRAPH}/refresh_access_token`, {
    params: { grant_type: 'ig_refresh_token', access_token: token.accessToken },
  });

  await saveToken(userId, 'instagram', {
    accessToken: data.access_token,
    tokenType: data.token_type,
    expiresIn: data.expires_in,
    scopes: token.scopes,
    platformUserId: token.platform_user_id,
    platformUsername: token.platform_username,
  });
}
