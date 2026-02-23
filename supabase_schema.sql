-- ============================================================
-- Pub Quiz Scoreboard — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (one shot).
-- ============================================================

-- 1. Tables --------------------------------------------------

CREATE TABLE quiz_config (
  id              int PRIMARY KEY DEFAULT 1,
  rounds          int NOT NULL DEFAULT 5,
  questions_per_round int NOT NULL DEFAULT 10,
  has_tipovacka   jsonb NOT NULL DEFAULT '[]'::jsonb,   -- array of booleans, one per round
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Only ever one row
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE teams (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  round_number    int NOT NULL,
  standard_points numeric(4,1) NOT NULL DEFAULT 0,
  tipovacka_point int NOT NULL DEFAULT 0 CHECK (tipovacka_point IN (0, 1)),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_team_round UNIQUE (team_id, round_number)
);

-- 2. Indexes -------------------------------------------------

CREATE INDEX idx_scores_team   ON scores(team_id);
CREATE INDEX idx_scores_round  ON scores(round_number);

-- 3. Row Level Security --------------------------------------

ALTER TABLE quiz_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores      ENABLE ROW LEVEL SECURITY;

-- Public read access (anon + authenticated)
CREATE POLICY "Anyone can read quiz_config"
  ON quiz_config FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read teams"
  ON teams FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read scores"
  ON scores FOR SELECT
  USING (true);

-- Authenticated write access
CREATE POLICY "Admins can insert quiz_config"
  ON quiz_config FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update quiz_config"
  ON quiz_config FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete quiz_config"
  ON quiz_config FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert scores"
  ON scores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update scores"
  ON scores FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can delete scores"
  ON scores FOR DELETE
  TO authenticated
  USING (true);
