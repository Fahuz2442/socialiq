import axios from 'axios';
import { saveToken, getToken } from './tokenStore.js';
import { db } from '../db/client.js';

const AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API_BASE  = 'https://www.googleapis.com/youtube/v3';

const config = {
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri: `${process.env.BACKEND_URL}/api/auth/youtube/callback`,
  scopes: [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
  ],
};

export function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${AUTH_BASE}?${params}`;
}

async function exchangeCode(code) {
  const { data } = await axios.post(TOKEN_URL, {
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });
  return data;
}

async function doRefresh(refreshToken) {
  const { data } = await axios.post(TOKEN_URL, {
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });
  return data;
}

export async function handleCallback(userId, code) {
  const tokens = await exchangeCode(code);
  const { data: channel } = await axios.get(`${API_BASE}/channels`, {
    params: { part: 'snippet', mine: true },
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const ch = channel.items?.[0];
  await saveToken(userId, 'youtube', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: config.scopes,
    platformUserId: ch?.id,
    platformUsername: ch?.snippet?.title,
  });
  return { username: ch?.snippet?.title, platformUserId: ch?.id };
}

async function getValidToken(userId) {
  let token = await getToken(userId, 'youtube');
  if (!token) throw new Error('YouTube not connected');
  if (token.expired && token.refreshToken) {
    const fresh = await doRefresh(token.refreshToken);
    await saveToken(userId, 'youtube', {
      accessToken: fresh.access_token,
      refreshToken: token.refreshToken,
      expiresIn: fresh.expires_in,
      scopes: token.scopes,
      platformUserId: token.platform_user_id,
      platformUsername: token.platform_username,
    });
    token = await getToken(userId, 'youtube');
  }
  return token;
}

export async function syncPosts(userId) {
  const token = await getValidToken(userId);
  const { data } = await axios.get(`${API_BASE}/search`, {
    params: { part: 'snippet', forMine: true, type: 'video', maxResults: 25 },
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  for (const item of data.items || []) {
    await db.query(
      `INSERT INTO posts (user_id, platform, platform_post_id, content_type, caption, permalink, posted_at)
       VALUES ($1, 'youtube', $2, 'video', $3, $4, $5)
       ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
         caption = EXCLUDED.caption, synced_at = NOW()`,
      [userId, item.id.videoId, item.snippet.title,
       `https://youtube.com/watch?v=${item.id.videoId}`, item.snippet.publishedAt]
    );
  }
  return data.items?.length || 0;
}

export async function fetchPostMetrics(userId, platformPostId) {
  const token = await getValidToken(userId);
  const { data } = await axios.get(`${API_BASE}/videos`, {
    params: { part: 'statistics', id: platformPostId },
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  const s = data.items?.[0]?.statistics || {};
  return {
    likes: parseInt(s.likeCount || 0),
    comments: parseInt(s.commentCount || 0),
    shares: 0,
    saves: parseInt(s.favoriteCount || 0),
    reach: 0,
    impressions: 0,
    video_views: parseInt(s.viewCount || 0),
  };
}
