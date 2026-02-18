-- ============================================
-- TaskSpace EOD Dashboard - Schema Additions
-- New tables for enhanced features
-- ============================================

-- Focus Sessions for deep work tracking
CREATE TABLE IF NOT EXISTS focus_sessions (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(255) REFERENCES assigned_tasks(id) ON DELETE SET NULL,
  rock_id VARCHAR(255) REFERENCES rocks(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  break_minutes INTEGER DEFAULT 0,
  session_type VARCHAR(50) DEFAULT 'pomodoro', -- pomodoro, custom, deep_work
  notes TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Subtasks for checklist functionality
CREATE TABLE IF NOT EXISTS task_subtasks (
  id VARCHAR(255) PRIMARY KEY,
  task_id VARCHAR(255) NOT NULL REFERENCES assigned_tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Entries for time tracking
CREATE TABLE IF NOT EXISTS time_entries (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id VARCHAR(255) REFERENCES assigned_tasks(id) ON DELETE SET NULL,
  rock_id VARCHAR(255) REFERENCES rocks(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  description TEXT,
  billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
  notes TEXT, -- Private notes
  mood VARCHAR(50), -- positive, neutral, negative
  energy_level INTEGER, -- 1-5
  productivity_rating INTEGER, -- 1-5
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, week_start)
);

-- Achievements system
CREATE TABLE IF NOT EXISTS achievements (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL, -- streak, tasks, rocks, engagement
  icon VARCHAR(100), -- emoji or icon name
  badge_color VARCHAR(50), -- color class
  criteria JSONB NOT NULL, -- { type: 'streak', threshold: 7 }
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
  progress INTEGER DEFAULT 0, -- For progressive achievements
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, achievement_id)
);

-- Rock dependencies for roadmap view
CREATE TABLE IF NOT EXISTS rock_dependencies (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rock_id VARCHAR(255) NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  depends_on_rock_id VARCHAR(255) NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  dependency_type VARCHAR(50) DEFAULT 'blocks', -- blocks, soft_dependency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(rock_id, depends_on_rock_id)
);

-- Dashboard layouts for customization
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL, -- Grid layout configuration
  widgets JSONB DEFAULT '[]', -- Enabled widgets with settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Recent items for quick access
CREATE TABLE IF NOT EXISTS recent_items (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- task, rock, eod_report
  item_id VARCHAR(255) NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standup reports (generated from EOD data)
CREATE TABLE IF NOT EXISTS standup_reports (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generated_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  content JSONB NOT NULL, -- { members: [{ name, yesterday, today, blockers }] }
  summary TEXT,
  shared_to JSONB DEFAULT '[]', -- [{ channel: 'slack', sent_at: ... }]
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, report_date)
);

-- Add mood field to eod_reports if not exists
ALTER TABLE eod_reports ADD COLUMN IF NOT EXISTS mood VARCHAR(50);
ALTER TABLE eod_reports ADD COLUMN IF NOT EXISTS energy_level INTEGER;

-- Add time tracking fields to assigned_tasks
ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER;
ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS actual_minutes INTEGER;
ALTER TABLE assigned_tasks ADD COLUMN IF NOT EXISTS time_tracking_enabled BOOLEAN DEFAULT FALSE;

-- Add dashboard preferences to organization_members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{}';

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON focus_sessions(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task ON focus_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_date ON focus_sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_task_subtasks_task ON task_subtasks(task_id);

CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(started_at);

CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_week ON weekly_reviews(week_start);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);

CREATE INDEX IF NOT EXISTS idx_rock_dependencies_rock ON rock_dependencies(rock_id);
CREATE INDEX IF NOT EXISTS idx_rock_dependencies_depends ON rock_dependencies(depends_on_rock_id);

CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON dashboard_layouts(user_id);

CREATE INDEX IF NOT EXISTS idx_recent_items_user ON recent_items(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_recent_items_viewed ON recent_items(viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_standup_reports_org ON standup_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_standup_reports_date ON standup_reports(report_date);

-- Insert default achievements
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
