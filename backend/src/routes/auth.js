import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from '../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { getConnectedPlatforms, deleteToken } from '../services/tokenStore.js';
import { generatePKCE } from '../services/twitter.js';

import * as instagram from '../services/instagram.js';
import * as youtube   from '../services/youtube.js';
import * as linkedin  from '../services/linkedin.js';
import * as twitter   from '../services/twitter.js';
import * as facebook  from '../services/facebook.js';

const SERVICES = { instagram, youtube, linkedin, twitter, facebook };
const router = Router();

// ─── Register ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: 'email, password and name required' });

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query(
      `INSERT INTO users (email, password, name) VALUES ($1, $2, $3)
       RETURNING id, email, name, role`,
      [email.toLowerCase(), hash, name]
    );
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    res.status(201).json({ token, user: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already in use' });
    throw err;
  }
});

// ─── Login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'email and password required' });

  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

// ─── Me ───────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// ─── Connected platforms ──────────────────────────────────────
router.get('/platforms', requireAuth, async (req, res) => {
  const platforms = await getConnectedPlatforms(req.user.id);
  res.json({ platforms });
});

// ─── Initiate OAuth ───────────────────────────────────────────
router.get('/:platform/connect', requireAuth, async (req, res) => {
  const { platform } = req.params;
  const svc = SERVICES[platform];
  if (!svc) return res.status(404).json({ error: `Unknown platform: ${platform}` });

  const state = crypto.randomBytes(16).toString('hex');
  let authUrl, codeVerifier = null;

  if (platform === 'twitter') {
    const pkce = generatePKCE();
    codeVerifier = pkce.verifier;
    authUrl = svc.getAuthUrl(state, pkce.challenge);
  } else {
    authUrl = svc.getAuthUrl(state);
  }

  await db.query(
    `INSERT INTO oauth_states (state, user_id, platform, code_verifier) VALUES ($1, $2, $3, $4)`,
    [state, req.user.id, platform, codeVerifier]
  );

  res.json({ authUrl });
});

// ─── OAuth Callback ───────────────────────────────────────────
router.get('/:platform/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, state, error } = req.query;
  const FRONT = process.env.FRONTEND_URL;

  if (error) return res.redirect(`${FRONT}/settings/platforms?error=${error}`);
  if (!code || !state) return res.redirect(`${FRONT}/settings/platforms?error=missing_params`);

  const { rows } = await db.query(
    `DELETE FROM oauth_states
     WHERE state = $1 AND platform = $2 AND expires_at > NOW()
     RETURNING *`,
    [state, platform]
  );

  if (!rows.length) return res.redirect(`${FRONT}/settings/platforms?error=invalid_state`);

  const { user_id, code_verifier } = rows[0];
  const svc = SERVICES[platform];

  try {
    const result = platform === 'twitter'
      ? await svc.handleCallback(user_id, code, code_verifier)
      : await svc.handleCallback(user_id, code);

    res.redirect(`${FRONT}/settings/platforms?connected=${platform}&username=${result.username}`);
  } catch (err) {
    console.error(`OAuth callback error [${platform}]:`, err.message);
    res.redirect(`${FRONT}/settings/platforms?error=callback_failed&platform=${platform}`);
  }
});

// ─── Disconnect ───────────────────────────────────────────────
router.delete('/:platform/disconnect', requireAuth, async (req, res) => {
  const { platform } = req.params;
  if (!SERVICES[platform]) return res.status(404).json({ error: `Unknown platform: ${platform}` });
  await deleteToken(req.user.id, platform);
  res.json({ success: true, platform });
});

export default router;
