import axios from 'axios';
import { saveToken, getToken } from './tokenStore.js';
import { db } from '../db/client.js';

const AUTH_BASE = 'https://www.facebook.com/v18.0/dialog/oauth';
const TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const GRAPH     = 'https://graph.facebook.com/v18.0';

const config = {
  clientId: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
  redirectUri: `${process.env.BACKEND_URL}/api/auth/facebook/callback`,
  scopes: ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content'],
};

export function getAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(','),
    response_type: 'code',
    state,
  });
  return `${AUTH_BASE}?${params}`;
}

export async function handleCallback(userId, code) {
  const { data: tokens } = await axios.get(TOKEN_URL, {
    params: {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    },
  });

  // Exchange short-lived for long-lived token
  const { data: longToken } = await axios.get(`${GRAPH}/oauth/access_token`, {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      fb_exchange_token: tokens.access_token,
    },
  });

  const { data: me } = await axios.get(`${GRAPH}/me`, {
    params: { fields: 'id,name', access_token: longToken.access_token },
  });

  await saveToken(userId, 'facebook', {
    accessToken: longToken.access_token,
    expiresIn: longToken.expires_in,
    scopes: config.scopes,
    platformUserId: me.id,
    platformUsername: me.name,
  });

  return { username: me.name, platformUserId: me.id };
}

export async function syncPosts(userId) {
  const token = await getToken(userId, 'facebook');
  if (!token) throw new Error('Facebook not connected');

  // Get first page the user manages
  const { data: pagesData } = await axios.get(`${GRAPH}/me/accounts`, {
    params: { access_token: token.accessToken },
  });

  const page = pagesData.data?.[0];
  if (!page) return 0;

  const { data } = await axios.get(`${GRAPH}/${page.id}/posts`, {
    params: {
      fields: 'id,message,permalink_url,created_time',
      limit: 25,
      access_token: page.access_token,
    },
  });

  for (const post of data.data || []) {
    await db.query(
      `INSERT INTO posts (user_id, platform, platform_post_id, content_type, caption, permalink, posted_at)
       VALUES ($1, 'facebook', $2, 'post', $3, $4, $5)
       ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
         caption = EXCLUDED.caption, synced_at = NOW()`,
      [userId, post.id, post.message, post.permalink_url, post.created_time]
    );
  }
  return data.data?.length || 0;
}

export async function fetchPostMetrics(userId, platformPostId) {
  const token = await getToken(userId, 'facebook');
  if (!token) throw new Error('Facebook not connected');

  const { data } = await axios.get(`${GRAPH}/${platformPostId}/insights`, {
    params: {
      metric: 'post_impressions,post_reach,post_reactions_by_type_total',
      access_token: token.accessToken,
    },
  });

  const m = {};
  for (const item of data.data || []) {
    m[item.name] = item.values?.[0]?.value ?? 0;
  }

  const reactions = typeof m.post_reactions_by_type_total === 'object'
    ? Object.values(m.post_reactions_by_type_total).reduce((a, b) => a + b, 0)
    : 0;

  return {
    likes: reactions,
    comments: 0,
    shares: 0,
    saves: 0,
    reach: m.post_reach || 0,
    impressions: m.post_impressions || 0,
  };
}
