-- ============================================================
-- Migration 002: Posts + Metrics
-- ============================================================

-- ─── Posts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL,
  platform_post_id  TEXT NOT NULL,           -- the ID from the platform's API
  content_type      TEXT,                    -- 'image' | 'video' | 'reel' | 'story' | 'text' etc.
  caption           TEXT,
  media_url         TEXT,
  permalink         TEXT,
  posted_at         TIMESTAMPTZ,
  synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_post_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_user_platform ON posts(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_posts_posted_at ON posts(posted_at DESC);

-- ─── Post Metrics ─────────────────────────────────────────────
-- Snapshot of metrics at a point in time (append-only for trend analysis)
CREATE TABLE IF NOT EXISTS post_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL,
  likes         INTEGER DEFAULT 0,
  comments      INTEGER DEFAULT 0,
  shares        INTEGER DEFAULT 0,
  saves         INTEGER DEFAULT 0,
  reach         INTEGER DEFAULT 0,
  impressions   INTEGER DEFAULT 0,
  clicks        INTEGER DEFAULT 0,
  video_views   INTEGER DEFAULT 0,
  engagement_rate NUMERIC(6,4) DEFAULT 0,    -- (likes+comments+shares) / reach
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_metrics_post_id ON post_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_metrics_user_platform ON post_metrics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_post_metrics_recorded_at ON post_metrics(recorded_at DESC);

-- ─── Account Metrics ──────────────────────────────────────────
-- Daily follower / reach snapshots at the account level
CREATE TABLE IF NOT EXISTS account_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform        TEXT NOT NULL,
  followers       INTEGER DEFAULT 0,
  following       INTEGER DEFAULT 0,
  total_posts     INTEGER DEFAULT 0,
  profile_views   INTEGER DEFAULT 0,
  reach_7d        INTEGER DEFAULT 0,
  impressions_7d  INTEGER DEFAULT 0,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_metrics_user_platform
  ON account_metrics(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_account_metrics_recorded_at
  ON account_metrics(recorded_at DESC);
