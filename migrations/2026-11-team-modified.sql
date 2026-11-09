-- ============================================================
-- Mark teams that were renamed / changed / added after the quiz
-- started. Run ONCE in the Supabase SQL Editor.
-- The admin page shows a small icon (with the notes as tooltip)
-- for teams where this column is filled in.
-- ============================================================
ALTER TABLE teams ADD COLUMN IF NOT EXISTS mod_note text;
