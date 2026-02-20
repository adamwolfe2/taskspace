-- Migration: Create missing achievements and weekly_reviews tables
-- These tables were defined in schema-additions.sql but never migrated to production.
-- Errors: relation "user_achievements" / "achievements" / "weekly_reviews" does not exist

-- Weekly Reviews for personal reflection
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  accomplishments JSONB DEFAULT '[]',
  went_well TEXT,
  could_improve TEXT,
  next_week_goals JSONB DEFAULT '[]',
  notes TEXT,
  mood VARCHAR(50),
  energy_level INTEGER,
  productivity_rating INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, week_start)
);

-- Achievements catalog
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  icon VARCHAR(100),
  badge_color VARCHAR(50),
  criteria JSONB NOT NULL,
  points INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements (earned badges)
CREATE TABLE IF NOT EXISTS user_achievements (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(255) NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week ON weekly_reviews(week_start);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);

-- Seed default achievements
INSERT INTO achievements (id, name, description, category, icon, badge_color, criteria, points) VALUES
  ('ach_streak_7', '7-Day Streak', 'Submit EOD reports for 7 consecutive days', 'streak', 'flame', 'text-orange-500', '{"type": "eod_streak", "threshold": 7}', 100),
  ('ach_streak_14', '14-Day Streak', 'Submit EOD reports for 14 consecutive days', 'streak', 'flame', 'text-orange-600', '{"type": "eod_streak", "threshold": 14}', 250),
  ('ach_streak_30', '30-Day Streak', 'Submit EOD reports for 30 consecutive days', 'streak', 'flame', 'text-red-500', '{"type": "eod_streak", "threshold": 30}', 500),
  ('ach_streak_50', '50-Day Streak', 'Submit EOD reports for 50 consecutive days', 'streak', 'flame', 'text-red-600', '{"type": "eod_streak", "threshold": 50}', 1000),
  ('ach_streak_100', 'Century Streak', 'Submit EOD reports for 100 consecutive days', 'streak', 'crown', 'text-yellow-500', '{"type": "eod_streak", "threshold": 100}', 2500),
  ('ach_tasks_10', 'Task Starter', 'Complete 10 tasks', 'tasks', 'check-circle', 'text-green-500', '{"type": "tasks_completed", "threshold": 10}', 50),
  ('ach_tasks_50', 'Task Master', 'Complete 50 tasks', 'tasks', 'check-circle-2', 'text-green-600', '{"type": "tasks_completed", "threshold": 50}', 200),
  ('ach_tasks_100', 'Task Champion', 'Complete 100 tasks', 'tasks', 'trophy', 'text-green-700', '{"type": "tasks_completed", "threshold": 100}', 500),
  ('ach_tasks_500', 'Task Legend', 'Complete 500 tasks', 'tasks', 'star', 'text-emerald-500', '{"type": "tasks_completed", "threshold": 500}', 1500),
  ('ach_rock_complete', 'Rock Solid', 'Complete your first quarterly rock', 'rocks', 'target', 'text-blue-500', '{"type": "rocks_completed", "threshold": 1}', 200),
  ('ach_rocks_5', 'Goal Getter', 'Complete 5 quarterly rocks', 'rocks', 'mountain', 'text-blue-600', '{"type": "rocks_completed", "threshold": 5}', 750),
  ('ach_first_eod', 'First Steps', 'Submit your first EOD report', 'engagement', 'footprints', 'text-purple-500', '{"type": "first_eod", "threshold": 1}', 25),
  ('ach_perfect_week', 'Perfect Week', 'Submit EOD reports for an entire work week', 'engagement', 'calendar-check', 'text-indigo-500', '{"type": "perfect_week", "threshold": 1}', 150),
  ('ach_early_bird', 'Early Bird', 'Submit 10 EOD reports before 5 PM', 'engagement', 'sunrise', 'text-amber-500', '{"type": "early_eod", "threshold": 10}', 100),
  ('ach_focus_hour', 'Focus Hour', 'Complete 1 hour of focused work', 'engagement', 'clock', 'text-cyan-500', '{"type": "focus_time", "threshold": 60}', 50),
  ('ach_focus_master', 'Focus Master', 'Complete 10 hours of focused work', 'engagement', 'brain', 'text-cyan-600', '{"type": "focus_time", "threshold": 600}', 300)
ON CONFLICT (id) DO NOTHING;
