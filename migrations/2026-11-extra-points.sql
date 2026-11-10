-- ============================================================
-- Extra points (ticket, after party, bet, 2x question)
-- Run ONCE in the Supabase SQL Editor before using the new admin page.
-- Safe for existing data: nothing changes until you enable an extra.
-- ============================================================

-- Settings for the new extras (enabled flags, names, point values, doubled rounds)
ALTER TABLE quiz_config ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Per team: ticket / party yes-no and the bet (round + guess)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS extras jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Per team per round: points the team got on that round's doubled (2x) question
ALTER TABLE scores ADD COLUMN IF NOT EXISTS double_points numeric(3,1) NOT NULL DEFAULT 0;
ALTER TABLE scores DROP CONSTRAINT IF EXISTS double_points_range;
ALTER TABLE scores ADD CONSTRAINT double_points_range CHECK (double_points >= 0 AND double_points <= 10);
