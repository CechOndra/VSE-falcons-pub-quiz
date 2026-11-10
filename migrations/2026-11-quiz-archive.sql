-- ============================================================
-- Quiz archive — run ONCE in the Supabase SQL Editor.
-- Stores full snapshots (setup, teams, scores) of past or test
-- quizzes so they can be viewed, exported or restored.
-- Admin only: the public scoreboard cannot read this table.
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_archive (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_test     boolean NOT NULL DEFAULT false,
  archived_at timestamptz NOT NULL DEFAULT now(),
  summary     jsonb NOT NULL DEFAULT '{}'::jsonb,   -- small info for the list (teams, rounds, top 3)
  snapshot    jsonb NOT NULL                        -- {config, teams, scores}
);

ALTER TABLE quiz_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read quiz_archive"   ON quiz_archive;
DROP POLICY IF EXISTS "Admins can insert quiz_archive" ON quiz_archive;
DROP POLICY IF EXISTS "Admins can update quiz_archive" ON quiz_archive;
DROP POLICY IF EXISTS "Admins can delete quiz_archive" ON quiz_archive;

CREATE POLICY "Admins can read quiz_archive"   ON quiz_archive FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert quiz_archive" ON quiz_archive FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update quiz_archive" ON quiz_archive FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete quiz_archive" ON quiz_archive FOR DELETE TO authenticated USING (true);
