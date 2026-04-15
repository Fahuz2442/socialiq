-- ============================================================
-- Migration 001: Users + Platform Tokens
-- Run: node src/db/migrate.js
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member', -- 'admin' | 'member'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Platform OAuth Tokens ───────────────────────────────────
-- access_token and refresh_token are AES-encrypted before storage
CREATE TABLE IF NOT EXISTS platform_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL, -- 'instagram' | 'youtube' | 'linkedin' | 'twitter' | 'facebook'
  access_token    TEXT NOT NULL,          -- encrypted
  refresh_token   TEXT,                   -- encrypted, nullable (some platforms don't issue one)
  token_type      TEXT NOT NULL DEFAULT 'Bearer',
  scopes          TEXT[],                 -- granted scopes array
  expires_at      TIMESTAMPTZ,            -- NULL = non-expiring
  platform_user_id   TEXT,               -- the user's ID on that platform
  platform_username  TEXT,               -- the user's handle on that platform
  connected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_platform_tokens_user_platform
  ON platform_tokens(user_id, platform);

-- ─── OAuth State Nonces ───────────────────────────────────────
-- Short-lived rows to validate OAuth callback state params (CSRF protection)
CREATE TABLE IF NOT EXISTS oauth_states (
  state       TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL,
  code_verifier TEXT,                    -- for PKCE (Twitter uses this)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Auto-clean expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires
  ON oauth_states(expires_at);
