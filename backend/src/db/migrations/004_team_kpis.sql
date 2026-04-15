-- Migration 004: Team Members + KPI Scores
CREATE TABLE IF NOT EXISTS team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member',
  avatar_color  TEXT NOT NULL DEFAULT '#818cf8',
  platforms     TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

CREATE TABLE IF NOT EXISTS kpi_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  owner_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start        DATE NOT NULL,
  engagement_rate   NUMERIC(5,2) DEFAULT 0,  -- 30% weight
  reach_growth      NUMERIC(5,2) DEFAULT 0,  -- 25% weight
  consistency       NUMERIC(5,2) DEFAULT 0,  -- 20% weight
  innovation        NUMERIC(5,2) DEFAULT 0,  -- 15% weight
  timeliness        NUMERIC(5,2) DEFAULT 0,  -- 10% weight
  total_score       NUMERIC(5,2) DEFAULT 0,  -- weighted total out of 100
  posts_count       INTEGER DEFAULT 0,
  total_likes       INTEGER DEFAULT 0,
  total_comments    INTEGER DEFAULT 0,
  total_reach       INTEGER DEFAULT 0,
  calculated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_kpi_scores_member_id ON kpi_scores(member_id);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_week_start ON kpi_scores(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_scores_owner_id ON kpi_scores(owner_id);
