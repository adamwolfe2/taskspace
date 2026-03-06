-- Add streak freeze columns to user_streaks table
-- Each user gets 2 freezes per month; auto-resets monthly.

ALTER TABLE user_streaks
  ADD COLUMN IF NOT EXISTS streak_freezes_remaining INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS streak_freezes_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freeze_reset_date DATE DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month')::date;
