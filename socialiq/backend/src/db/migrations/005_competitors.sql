-- Migration 005: Competitors
CREATE TABLE IF NOT EXISTS competitors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  platform        TEXT NOT NULL,
  handle          TEXT NOT NULL,
  platform_id     TEXT,
  avatar_url      TEXT,
  followers       INTEGER DEFAULT 0,
  following       INTEGER DEFAULT 0,
  total_posts     INTEGER DEFAULT 0,
  avg_likes       NUMERIC(10,2) DEFAULT 0,
  avg_comments    NUMERIC(10,2) DEFAULT 0,
  avg_engagement  NUMERIC(6,4) DEFAULT 0,
  posts_per_week  NUMERIC(5,2) DEFAULT 0,
  last_synced_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, platform, handle)
);

CREATE TABLE IF NOT EXISTS competitor_posts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id       UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  platform_post_id    TEXT NOT NULL,
  caption             TEXT,
  media_url           TEXT,
  permalink           TEXT,
  likes               INTEGER DEFAULT 0,
  comments            INTEGER DEFAULT 0,
  posted_at           TIMESTAMPTZ,
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(competitor_id, platform_post_id)
);

CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_posts_competitor_id ON competitor_posts(competitor_id);