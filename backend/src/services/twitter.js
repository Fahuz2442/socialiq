import axios from 'axios';
import crypto from 'crypto';
import { saveToken, getToken } from './tokenStore.js';
import { db } from '../db/client.js';

const AUTH_BASE = 'https://twitter.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const API_BASE  = 'https://api.twitter.com/2';

const config = {
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
  redirectUri: `${process.env.BACKEND_URL}/api/auth/twitter/callback`,
  scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
};

// ─── PKCE helpers ─────────────────────────────────────────────
export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

export function getAuthUrl(state, codeChallenge) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_BASE}?${params}`;
}

function basicAuth() {
  return Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
}

export async function handleCallback(userId, code, codeVerifier) {
  const form = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const { data: tokens } = await axios.post(TOKEN_URL, form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth()}`,
    },
  });

  const { data: me } = await axios.get(`${API_BASE}/users/me`, {
    params: { 'user.fields': 'id,username,name' },
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  await saveToken(userId, 'twitter', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: config.scopes,
    platformUserId: me.data.id,
    platformUsername: me.data.username,
  });

  return { username: me.data.username, platformUserId: me.data.id };
}

async function refreshIfNeeded(userId) {
  let token = await getToken(userId, 'twitter');
  if (!token) throw new Error('Twitter not connected');

  if (token.expired && token.refreshToken) {
    const form = new URLSearchParams({
      refresh_token: token.refreshToken,
      grant_type: 'refresh_token',
    });
    const { data: fresh } = await axios.post(TOKEN_URL, form.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth()}`,
      },
    });
    await saveToken(userId, 'twitter', {
      accessToken: fresh.access_token,
      refreshToken: fresh.refresh_token,
      expiresIn: fresh.expires_in,
      scopes: token.scopes,
      platformUserId: token.platform_user_id,
      platformUsername: token.platform_username,
    });
    token = await getToken(userId, 'twitter');
  }

  return token;
}

export async function syncPosts(userId) {
  const token = await refreshIfNeeded(userId);

  const { data } = await axios.get(
    `${API_BASE}/users/${token.platform_user_id}/tweets`,
    {
      params: {
        max_results: 25,
        'tweet.fields': 'created_at,public_metrics,attachments',
      },
      headers: { Authorization: `Bearer ${token.accessToken}` },
    }
  );

  for (const tweet of data.data || []) {
    await db.query(
      `INSERT INTO posts (user_id, platform, platform_post_id, content_type, caption,
        permalink, posted_at)
       VALUES ($1, 'twitter', $2, 'tweet', $3, $4, $5)
       ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
         caption = EXCLUDED.caption, synced_at = NOW()`,
      [
        userId,
        tweet.id,
        tweet.text,
        `https://twitter.com/i/web/status/${tweet.id}`,
        tweet.created_at,
      ]
    );
  }
  return data.data?.length || 0;
}

export async function fetchPostMetrics(userId, platformPostId) {
  const token = await refreshIfNeeded(userId);

  const { data } = await axios.get(`${API_BASE}/tweets/${platformPostId}`, {
    params: { 'tweet.fields': 'public_metrics' },
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  const m = data.data?.public_metrics || {};
  return {
    likes: m.like_count || 0,
    comments: m.reply_count || 0,
    shares: m.retweet_count || 0,
    saves: m.bookmark_count || 0,
    reach: 0,
    impressions: m.impression_count || 0,
  };
}
