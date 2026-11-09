-- ============================================================
-- Drinking bonus rework — run ONCE in the Supabase SQL Editor
-- (before using the new admin page).
--
-- Safe for existing data: current quizzes keep working as the
-- old yes/no shots bonus worth 1 point.
-- ============================================================

-- 1. Bonus settings on the quiz config
ALTER TABLE quiz_config
  ADD COLUMN IF NOT EXISTS bonus_label      text         NOT NULL DEFAULT 'Drinking',
  ADD COLUMN IF NOT EXISTS bonus_mode       text         NOT NULL DEFAULT 'yes_no',
  ADD COLUMN IF NOT EXISTS bonus_max        int          NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS bonus_yes_points numeric(3,1) NOT NULL DEFAULT 1;

ALTER TABLE quiz_config
  DROP CONSTRAINT IF EXISTS bonus_mode_valid,
  ADD  CONSTRAINT bonus_mode_valid CHECK (bonus_mode IN ('yes_no', 'count'));

ALTER TABLE quiz_config
  DROP CONSTRAINT IF EXISTS bonus_max_valid,
  ADD  CONSTRAINT bonus_max_valid CHECK (bonus_max BETWEEN 1 AND 20);

-- 2. Teams: shots_bonus used to be limited to 0/1. In "count" mode it can be
--    0..bonus_max (the admin page enforces the upper limit).
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_shots_bonus_check;
ALTER TABLE teams
  DROP CONSTRAINT IF EXISTS teams_shots_bonus_range,
  ADD  CONSTRAINT teams_shots_bonus_range CHECK (shots_bonus >= 0);
