-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  subscription JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members table
-- user_id is nullable to support draft members (created before invitation)
CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  department VARCHAR(255) DEFAULT 'General',
  weekly_measurable TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  timezone VARCHAR(100),
  eod_reminder_time VARCHAR(10),
  manager_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  job_title VARCHAR(255),
  notification_preferences JSONB DEFAULT '{
    "task_assigned": {"email": true, "inApp": true, "slack": true},
    "eod_reminder": {"email": true, "inApp": true, "slack": false},
    "escalation": {"email": true, "inApp": true, "slack": true},
    "rock_updated": {"email": false, "inApp": true, "slack": false},
    "digest": {"email": true, "slack": true}
  }'
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address VARCHAR(50)
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  department VARCHAR(255) DEFAULT 'General',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending'
);

-- Rocks (quarterly goals) table
CREATE TABLE IF NOT EXISTS rocks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'on-track',
  bucket VARCHAR(255),
  outcome TEXT,
  done_when JSONB DEFAULT '[]',
  quarter VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(50) DEFAULT 'today',
  completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assigned tasks table
CREATE TABLE IF NOT EXISTS assigned_tasks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assignee_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_name VARCHAR(255),
  assigned_by_id VARCHAR(255),
  assigned_by_name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'personal',
  rock_id VARCHAR(255),
  rock_title VARCHAR(500),
  priority VARCHAR(50) DEFAULT 'normal',
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  added_to_eod BOOLEAN DEFAULT FALSE,
  eod_report_id VARCHAR(255),
  comments JSONB DEFAULT '[]',
  recurrence JSONB,
  parent_recurring_task_id VARCHAR(255),
  recurring_task_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'manual',
  asana_gid VARCHAR(255),
  ai_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EOD Reports table
-- Note: Multiple reports per user per day are allowed (no UNIQUE constraint on org+user+date)
CREATE TABLE IF NOT EXISTS eod_reports (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks JSONB DEFAULT '[]',
  challenges TEXT,
  tomorrow_priorities JSONB DEFAULT '[]',
  needs_escalation BOOLEAN DEFAULT FALSE,
  escalation_note TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- API Keys table for external integrations (MCP, Claude Desktop, etc.)
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(255) UNIQUE NOT NULL,
  scopes JSONB DEFAULT '["read", "write"]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- AI COMMAND CENTER TABLES
-- ============================================

-- Admin brain dumps for AI processing
CREATE TABLE IF NOT EXISTS admin_brain_dumps (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  admin_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  tasks_generated INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EOD Insights from AI analysis
CREATE TABLE IF NOT EXISTS eod_insights (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  eod_report_id VARCHAR(255) NOT NULL REFERENCES eod_reports(id) ON DELETE CASCADE,
  completed_items JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  sentiment VARCHAR(50) DEFAULT 'neutral',
  sentiment_score INTEGER DEFAULT 50,
  categories JSONB DEFAULT '[]',
  highlights JSONB DEFAULT '[]',
  ai_summary TEXT,
  follow_up_questions JSONB DEFAULT '[]',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Generated Tasks pending approval
CREATE TABLE IF NOT EXISTS ai_generated_tasks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brain_dump_id VARCHAR(255),
  assignee_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignee_name VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'medium',
  due_date DATE,
  context TEXT,
  status VARCHAR(50) DEFAULT 'pending_approval',
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  converted_task_id VARCHAR(255),
  pushed_to_slack BOOLEAN DEFAULT FALSE,
  pushed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Digests
CREATE TABLE IF NOT EXISTS daily_digests (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,
  summary TEXT,
  wins JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  follow_ups JSONB DEFAULT '[]',
  challenge_questions JSONB DEFAULT '[]',
  team_sentiment VARCHAR(50) DEFAULT 'neutral',
  reports_analyzed INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, digest_date)
);

-- AI Conversations for copilot
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT,
  context_used JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Templates table
CREATE TABLE IF NOT EXISTS task_templates (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by VARCHAR(255) NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  default_rock_id VARCHAR(255),
  recurrence JSONB,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Google Calendar OAuth tokens
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  expiry_date BIGINT NOT NULL,
  scope TEXT,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Google Calendar event mappings (link TaskSpace items to Google Calendar events)
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  item_id VARCHAR(255) NOT NULL,
  calendar_id VARCHAR(255) DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, google_event_id)
);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON organization_members(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_rocks_org_id ON rocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_rocks_user_id ON rocks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON assigned_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON assigned_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_eod_org_user_date ON eod_reports(organization_id, user_id, date);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_brain_dumps_org ON admin_brain_dumps(organization_id);
CREATE INDEX IF NOT EXISTS idx_eod_insights_report ON eod_insights(eod_report_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_org ON ai_generated_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_digests_org_date ON daily_digests(organization_id, digest_date);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, organization_id);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_org ON notifications(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, organization_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON assigned_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON assigned_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_rocks_status ON rocks(status);
CREATE INDEX IF NOT EXISTS idx_rocks_quarter ON rocks(quarter);
CREATE INDEX IF NOT EXISTS idx_eod_date ON eod_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_task_templates_org ON task_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_user ON task_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_org ON push_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_user ON google_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_item ON google_calendar_events(item_type, item_id);

-- Manager relationships index
CREATE INDEX IF NOT EXISTS idx_members_manager_id ON organization_members(manager_id);
CREATE INDEX IF NOT EXISTS idx_members_org_manager ON organization_members(organization_id, manager_id);

-- ============================================
-- WEEKLY SCORECARD TABLES (EOS-style metrics)
-- ============================================

-- Team member metrics - defines the measurable for each team member
CREATE TABLE IF NOT EXISTS team_member_metrics (
  id VARCHAR(255) PRIMARY KEY,
  team_member_id VARCHAR(255) NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  weekly_goal INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one active metric per member
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_metric_per_member
ON team_member_metrics(team_member_id)
WHERE is_active = true;

-- Weekly metric entries - stores aggregated weekly values
CREATE TABLE IF NOT EXISTS weekly_metric_entries (
  id VARCHAR(255) PRIMARY KEY,
  team_member_id VARCHAR(255) NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  metric_id VARCHAR(255) NOT NULL REFERENCES team_member_metrics(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL, -- Always a Friday
  actual_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_member_id, week_ending)
);

CREATE INDEX IF NOT EXISTS idx_weekly_entries_week ON weekly_metric_entries(week_ending);
CREATE INDEX IF NOT EXISTS idx_weekly_entries_member ON weekly_metric_entries(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_metrics_member ON team_member_metrics(team_member_id);

-- Add metric_value_today to eod_reports for daily tracking
ALTER TABLE eod_reports ADD COLUMN IF NOT EXISTS metric_value_today INTEGER DEFAULT NULL;

-- Add attachments to eod_reports for file/image uploads
ALTER TABLE eod_reports ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- ============================================
-- ASANA INTEGRATION COLUMNS
-- ============================================

-- Add Asana fields to organization_members for per-user Asana connection
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS asana_pat TEXT;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS asana_workspace_gid VARCHAR(255);
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS asana_last_sync_at TIMESTAMP WITH TIME ZONE;

-- Note: Asana fields (source, asana_gid) are now in assigned_tasks CREATE TABLE

-- Index for efficient Asana task lookup
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_asana_gid ON assigned_tasks(asana_gid) WHERE asana_gid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_source ON assigned_tasks(source);

-- ============================================
-- ORG CHART ROCK PROGRESS TABLE
-- ============================================

-- Tracks individual rock bullet completion for org chart employees
CREATE TABLE IF NOT EXISTS org_chart_rock_progress (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  employee_name VARCHAR(255) NOT NULL,
  rock_index INTEGER NOT NULL,
  bullet_index INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(255),
  UNIQUE(employee_name, rock_index, bullet_index)
);

CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_employee ON org_chart_rock_progress(employee_name);
CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_composite ON org_chart_rock_progress(employee_name, rock_index);

-- ============================================
-- MA EMPLOYEES TABLE (Org Chart Data Source)
-- ============================================

-- Stores organization employees for the org chart
-- Hierarchy is built from the supervisor field (name matching)
-- Note: full_name is computed in queries, not stored as a generated column
CREATE TABLE IF NOT EXISTS ma_employees (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  supervisor VARCHAR(255), -- Full name of supervisor (NULL = CEO/top level)
  department VARCHAR(100),
  job_title VARCHAR(255),
  responsibilities TEXT, -- Job duties (used for AI search/RAG)
  notes TEXT, -- Additional context about the role
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ma_employees_supervisor ON ma_employees(supervisor);
CREATE INDEX IF NOT EXISTS idx_ma_employees_department ON ma_employees(department);
CREATE INDEX IF NOT EXISTS idx_ma_employees_active ON ma_employees(is_active) WHERE is_active = TRUE;

-- ============================================
-- ONBOARDING PROGRESS COLUMNS
-- ============================================

ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT FALSE;
