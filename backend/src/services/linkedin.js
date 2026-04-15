import axios from 'axios';
import { saveToken, getToken } from './tokenStore.js';
import { db } from '../db/client.js';

const AUTH_BASE = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const API_BASE  = 'https://api.linkedin.com/v2';

const config = {
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: `${process.env.BACKEND_URL}/api/auth/linkedin/callback`,
  scopes: ['r_liteprofile', 'r_emailaddress', 'w_member_social', 'r_organization_social'],
};

export function getAuthUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: config.scopes.join(' '),
  });
  return `${AUTH_BASE}?${params}`;
}

export async function handleCallback(userId, code) {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const { data: tokens } = await axios.post(TOKEN_URL, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { data: profile } = await axios.get(`${API_BASE}/me`, {
    params: { projection: '(id,localizedFirstName,localizedLastName)' },
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const username = `${profile.localizedFirstName} ${profile.localizedLastName}`;

  await saveToken(userId, 'linkedin', {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || null,
    expiresIn: tokens.expires_in,
    scopes: config.scopes,
    platformUserId: profile.id,
    platformUsername: username,
  });

  return { username, platformUserId: profile.id };
}

export async function syncPosts(userId) {
  const token = await getToken(userId, 'linkedin');
  if (!token) throw new Error('LinkedIn not connected');

  const { data } = await axios.get(`${API_BASE}/ugcPosts`, {
    params: {
      q: 'authors',
      authors: `List(urn:li:person:${token.platform_user_id})`,
      count: 25,
    },
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  for (const post of data.elements || []) {
    const text = post.specificContent?.['com.linkedin.ugc.ShareContent']
      ?.shareCommentary?.text || '';

    await db.query(
      `INSERT INTO posts (user_id, platform, platform_post_id, content_type, caption, posted_at)
       VALUES ($1, 'linkedin', $2, 'post', $3, $4)
       ON CONFLICT (user_id, platform, platform_post_id) DO UPDATE SET
         caption = EXCLUDED.caption, synced_at = NOW()`,
      [userId, post.id, text, post.created?.time ? new Date(post.created.time) : null]
    );
  }
  return data.elements?.length || 0;
}

export async function fetchPostMetrics(userId, platformPostId) {
  const token = await getToken(userId, 'linkedin');
  if (!token) throw new Error('LinkedIn not connected');

  const { data } = await axios.get(`${API_BASE}/socialActions/${platformPostId}`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });

  return {
    likes: data.likesSummary?.totalLikes || 0,
    comments: data.commentsSummary?.totalFirstLevelComments || 0,
    shares: data.shareStatistics?.shareCount || 0,
    saves: 0,
    reach: 0,
    impressions: data.shareStatistics?.impressionCount || 0,
  };
}
