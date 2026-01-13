-- Migration: Initial Schema
-- This migration captures the complete schema from the original migration endpoint
-- Date: 2025-01-13

-- ============================================
-- CORE TABLES
-- ============================================

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
  owner_id VARCHAR(255) NOT NULL,
  settings JSONB DEFAULT '{}',
  subscription JSONB DEFAULT '{}',
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#dc2626',
  secondary_color VARCHAR(7) DEFAULT '#1f2937',
  custom_domain VARCHAR(255),
  favicon_url TEXT,
  billing_email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
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
  manager_id VARCHAR(255),
  job_title VARCHAR(255),
  notification_preferences JSONB DEFAULT '{}',
  skills JSONB DEFAULT '[]',
  capacity INTEGER DEFAULT 100,
  active_projects JSONB DEFAULT '[]',
  slack_user_id VARCHAR(255),
  asana_pat TEXT,
  asana_workspace_gid VARCHAR(255),
  asana_last_sync_at TIMESTAMP WITH TIME ZONE
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  organization_id VARCHAR(255) NOT NULL,
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
  organization_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  department VARCHAR(255) DEFAULT 'General',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending'
);

-- ============================================
-- EOS/ROCKS TABLES
-- ============================================

-- Rocks table
CREATE TABLE IF NOT EXISTS rocks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  due_date DATE,
  status VARCHAR(50) DEFAULT 'on-track',
  bucket VARCHAR(255),
  outcome TEXT,
  done_when JSONB DEFAULT '[]',
  quarter VARCHAR(50),
  milestones JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rock milestones table
CREATE TABLE IF NOT EXISTS rock_milestones (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rock_id VARCHAR(255) NOT NULL REFERENCES rocks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TASKS TABLES
-- ============================================

-- Assigned tasks table
CREATE TABLE IF NOT EXISTS assigned_tasks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  assignee_id VARCHAR(255) NOT NULL,
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
  source VARCHAR(50) DEFAULT 'manual',
  ai_context TEXT,
  asana_gid VARCHAR(255),
  comments JSONB DEFAULT '[]',
  recurrence JSONB,
  parent_recurring_task_id VARCHAR(255),
  recurring_task_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- EOD REPORTS TABLES
-- ============================================

-- EOD reports table
CREATE TABLE IF NOT EXISTS eod_reports (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  tasks JSONB DEFAULT '[]',
  challenges TEXT,
  tomorrow_priorities JSONB DEFAULT '[]',
  needs_escalation BOOLEAN DEFAULT FALSE,
  escalation_note TEXT,
  metric_value_today INTEGER DEFAULT NULL,
  attachments JSONB DEFAULT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, date)
);

-- ============================================
-- AUTH & SECURITY TABLES
-- ============================================

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  key VARCHAR(255) UNIQUE NOT NULL,
  scopes JSONB DEFAULT '["read", "write"]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI COMMAND CENTER TABLES
-- ============================================

-- Admin brain dumps
CREATE TABLE IF NOT EXISTS admin_brain_dumps (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  admin_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  tasks_generated INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EOD insights
CREATE TABLE IF NOT EXISTS eod_insights (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  eod_report_id VARCHAR(255) NOT NULL,
  completed_items JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  sentiment VARCHAR(20),
  sentiment_score INTEGER,
  categories JSONB DEFAULT '[]',
  highlights JSONB DEFAULT '[]',
  ai_summary TEXT,
  follow_up_questions JSONB DEFAULT '[]',
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI generated tasks
CREATE TABLE IF NOT EXISTS ai_generated_tasks (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  brain_dump_id VARCHAR(255),
  assignee_id VARCHAR(255) NOT NULL,
  assignee_name VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
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

-- Daily digests
CREATE TABLE IF NOT EXISTS daily_digests (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  digest_date DATE NOT NULL,
  summary TEXT,
  wins JSONB DEFAULT '[]',
  blockers JSONB DEFAULT '[]',
  concerns JSONB DEFAULT '[]',
  follow_ups JSONB DEFAULT '[]',
  challenge_questions JSONB DEFAULT '[]',
  team_sentiment VARCHAR(20),
  reports_analyzed INTEGER DEFAULT 0,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, digest_date)
);

-- AI conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  query TEXT NOT NULL,
  response TEXT,
  context_used JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AUDIT & WEBHOOK TABLES
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255),
  user_id VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  ip_address VARCHAR(50),
  user_agent TEXT,
  actor_id VARCHAR(255),
  actor_type VARCHAR(20) DEFAULT 'user',
  details JSONB DEFAULT '{}',
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook configs
CREATE TABLE IF NOT EXISTS webhook_configs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  secret VARCHAR(255),
  events JSONB DEFAULT '[]',
  enabled BOOLEAN DEFAULT TRUE,
  retry_count INTEGER DEFAULT 3,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_status_code INTEGER,
  failure_count INTEGER DEFAULT 0,
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  webhook_config_id VARCHAR(255) NOT NULL,
  webhook_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  response_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  attempt_count INTEGER DEFAULT 1,
  completed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- DATA RETENTION & SCHEDULED REPORTS
-- ============================================

-- Data retention policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL UNIQUE,
  eod_reports_days INTEGER DEFAULT 365,
  audit_logs_days INTEGER DEFAULT 730,
  ai_conversations_days INTEGER DEFAULT 90,
  notifications_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  schedule VARCHAR(50) NOT NULL,
  recipients JSONB DEFAULT '[]',
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recurring task templates
CREATE TABLE IF NOT EXISTS recurring_task_templates (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'normal',
  default_assignee_id VARCHAR(255),
  estimated_minutes INTEGER,
  labels JSONB DEFAULT '[]',
  recurrence_rule JSONB NOT NULL,
  next_run_date DATE,
  last_run_date DATE,
  occurrence_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WEEKLY SCORECARD TABLES
-- ============================================

-- Team member metrics
CREATE TABLE IF NOT EXISTS team_member_metrics (
  id VARCHAR(255) PRIMARY KEY,
  team_member_id VARCHAR(255) NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  weekly_goal INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly metric entries
CREATE TABLE IF NOT EXISTS weekly_metric_entries (
  id VARCHAR(255) PRIMARY KEY,
  team_member_id VARCHAR(255) NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  metric_id VARCHAR(255) NOT NULL REFERENCES team_member_metrics(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,
  actual_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_member_id, week_ending)
);

-- ============================================
-- ORG CHART TABLES
-- ============================================

-- Org chart rock progress
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

-- MA employees
CREATE TABLE IF NOT EXISTS ma_employees (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  supervisor VARCHAR(255),
  department VARCHAR(100),
  job_title VARCHAR(255),
  responsibilities TEXT,
  notes TEXT,
  email VARCHAR(255),
  rocks TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PRODUCTIVITY TRACKING TABLES
-- ============================================

-- Focus blocks
CREATE TABLE IF NOT EXISTS focus_blocks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('deep_work', 'meetings', 'admin', 'collaboration', 'learning', 'planning')),
  quality INTEGER CHECK (quality >= 1 AND quality <= 5),
  interruptions INTEGER DEFAULT 0,
  notes TEXT,
  task_id VARCHAR(255),
  rock_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily energy
CREATE TABLE IF NOT EXISTS daily_energy (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  energy_level VARCHAR(20) CHECK (energy_level IN ('low', 'medium', 'high', 'peak')),
  mood VARCHAR(10),
  factors JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, date)
);

-- User streaks
CREATE TABLE IF NOT EXISTS user_streaks (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_submission_date DATE,
  milestone_dates JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Focus score history
CREATE TABLE IF NOT EXISTS focus_score_history (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100),
  breakdown JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, date)
);

-- ============================================
-- MULTI-TENANCY & PRODUCTIZATION TABLES
-- ============================================

-- Subscription tiers
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,
  price_yearly INTEGER NOT NULL,
  max_seats INTEGER,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tier_id VARCHAR(255) NOT NULL REFERENCES subscription_tiers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  seats_purchased INTEGER DEFAULT 5,
  seats_used INTEGER DEFAULT 1,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Cross-workspace tasks
CREATE TABLE IF NOT EXISTS cross_workspace_tasks (
  id VARCHAR(255) PRIMARY KEY,
  source_organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_task_id VARCHAR(255),
  target_task_id VARCHAR(255),
  assigned_by_user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(50) DEFAULT 'normal',
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User organization preferences
CREATE TABLE IF NOT EXISTS user_organization_preferences (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE SET NULL,
  default_organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE SET NULL,
  organization_order JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- White label configs
CREATE TABLE IF NOT EXISTS white_label_configs (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brand_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  logo_dark_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#dc2626',
  secondary_color VARCHAR(7) DEFAULT '#1f2937',
  accent_color VARCHAR(7) DEFAULT '#3b82f6',
  custom_css TEXT,
  custom_domain VARCHAR(255),
  email_from_name VARCHAR(255),
  email_from_address VARCHAR(255),
  support_email VARCHAR(255),
  support_url TEXT,
  terms_url TEXT,
  privacy_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id)
);

-- Billing history
CREATE TABLE IF NOT EXISTS billing_history (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id VARCHAR(255) REFERENCES organization_subscriptions(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL,
  description TEXT,
  invoice_url TEXT,
  stripe_invoice_id VARCHAR(255),
  billing_period_start TIMESTAMP WITH TIME ZONE,
  billing_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization features
CREATE TABLE IF NOT EXISTS organization_features (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, feature_key)
);

-- ============================================
-- INDEXES
-- ============================================

-- User lookups
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Session validation
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_expires ON sessions(token, expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_org ON sessions(user_id, organization_id);

-- Members
CREATE INDEX IF NOT EXISTS idx_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_email ON organization_members(organization_id, email);
CREATE INDEX IF NOT EXISTS idx_members_user_org ON organization_members(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_members_org_status ON organization_members(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_members_email_lower ON organization_members(organization_id, LOWER(email));
CREATE INDEX IF NOT EXISTS idx_members_manager ON organization_members(organization_id, manager_id);

-- Rocks
CREATE INDEX IF NOT EXISTS idx_rocks_org_id ON rocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_rocks_user_id ON rocks(user_id);
CREATE INDEX IF NOT EXISTS idx_rocks_org_user ON rocks(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_rocks_org_status ON rocks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rocks_org_quarter ON rocks(organization_id, quarter);
CREATE INDEX IF NOT EXISTS idx_rock_milestones_rock_id ON rock_milestones(rock_id);
CREATE INDEX IF NOT EXISTS idx_rock_milestones_position ON rock_milestones(rock_id, position);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON assigned_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON assigned_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_assignee ON assigned_tasks(organization_id, assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON assigned_tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_org_due_date ON assigned_tasks(organization_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON assigned_tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_asana_gid ON assigned_tasks(asana_gid);
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_id ON assigned_tasks(recurring_task_id);

-- EOD Reports
CREATE INDEX IF NOT EXISTS idx_eod_org_date ON eod_reports(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_eod_user_date ON eod_reports(user_id, date);
CREATE INDEX IF NOT EXISTS idx_eod_org_user_date ON eod_reports(organization_id, user_id, date);

-- Auth
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_org_status ON invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_email_lower ON invitations(LOWER(email));

-- Rate limiting
CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON rate_limit_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_attempted_at ON rate_limit_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup ON rate_limit_attempts(identifier, attempted_at);

-- AI tables
CREATE INDEX IF NOT EXISTS idx_brain_dumps_org ON admin_brain_dumps(organization_id);
CREATE INDEX IF NOT EXISTS idx_brain_dumps_status ON admin_brain_dumps(status);
CREATE INDEX IF NOT EXISTS idx_eod_insights_report ON eod_insights(eod_report_id);
CREATE INDEX IF NOT EXISTS idx_eod_insights_org ON eod_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_generated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_org ON ai_generated_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_digests_date ON daily_digests(organization_id, digest_date);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_org ON ai_conversations(organization_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON audit_logs(user_id, created_at DESC);

-- Webhooks
CREATE INDEX IF NOT EXISTS idx_webhook_configs_org ON webhook_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_config ON webhook_deliveries(webhook_config_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);

-- Scheduled reports
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_org ON scheduled_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at);

-- Recurring templates
CREATE INDEX IF NOT EXISTS idx_recurring_templates_org ON recurring_task_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_next_run ON recurring_task_templates(next_run_date);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_active ON recurring_task_templates(is_active);

-- Scorecard
CREATE INDEX IF NOT EXISTS idx_weekly_entries_week ON weekly_metric_entries(week_ending);
CREATE INDEX IF NOT EXISTS idx_weekly_entries_member ON weekly_metric_entries(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_metrics_member ON team_member_metrics(team_member_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_metric_per_member ON team_member_metrics(team_member_id) WHERE is_active = true;

-- Org chart
CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_employee ON org_chart_rock_progress(employee_name);
CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_composite ON org_chart_rock_progress(employee_name, rock_index);
CREATE INDEX IF NOT EXISTS idx_ma_employees_supervisor ON ma_employees(supervisor);
CREATE INDEX IF NOT EXISTS idx_ma_employees_department ON ma_employees(department);
CREATE INDEX IF NOT EXISTS idx_ma_employees_active ON ma_employees(is_active);
CREATE INDEX IF NOT EXISTS idx_ma_employees_email ON ma_employees(email);

-- Productivity
CREATE INDEX IF NOT EXISTS idx_focus_blocks_user ON focus_blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_blocks_org ON focus_blocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_focus_blocks_user_time ON focus_blocks(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_focus_blocks_org_time ON focus_blocks(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_daily_energy_user ON daily_energy(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_energy_user_date ON daily_energy(user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_energy_org_date ON daily_energy(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_org_user ON user_streaks(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_focus_score_history_user ON focus_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_score_history_user_date ON focus_score_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_focus_score_history_org_date ON focus_score_history(organization_id, date);

-- Multi-tenancy
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_org ON organization_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_cross_workspace_source ON cross_workspace_tasks(source_organization_id);
CREATE INDEX IF NOT EXISTS idx_cross_workspace_target ON cross_workspace_tasks(target_organization_id);
CREATE INDEX IF NOT EXISTS idx_cross_workspace_user ON cross_workspace_tasks(assigned_by_user_id);
CREATE INDEX IF NOT EXISTS idx_user_org_prefs_user ON user_organization_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_org ON white_label_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_white_label_domain ON white_label_configs(custom_domain);
CREATE INDEX IF NOT EXISTS idx_billing_history_org ON billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_features_org ON organization_features(organization_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Data cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete expired sessions
  DELETE FROM sessions WHERE expires_at < NOW();

  -- Delete old rate limit attempts (older than 1 hour)
  DELETE FROM rate_limit_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour';

  -- Delete expired password reset tokens
  DELETE FROM password_reset_tokens WHERE expires_at < NOW();

  -- Delete expired invitations
  DELETE FROM invitations WHERE expires_at < NOW() AND status = 'pending';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, slug, description, price_monthly, price_yearly, max_seats, features, sort_order)
VALUES
  ('tier_free', 'Free', 'free', 'Perfect for individuals getting started', 0, 0, 5,
   '["Basic task management", "EOD reports", "1 rock per user", "Email support"]'::jsonb, 0),
  ('tier_starter', 'Starter', 'starter', 'For small teams running EOS', 1500, 14400, 15,
   '["Everything in Free", "Unlimited rocks", "Team scorecard", "AI-powered insights", "Asana integration", "Priority support"]'::jsonb, 1),
  ('tier_professional', 'Professional', 'professional', 'For growing organizations', 3500, 33600, 50,
   '["Everything in Starter", "Manager dashboards", "Advanced analytics", "Custom branding", "API access", "Google Calendar sync", "Dedicated success manager"]'::jsonb, 2),
  ('tier_enterprise', 'Enterprise', 'enterprise', 'For large organizations with custom needs', 7500, 72000, NULL,
   '["Everything in Professional", "Unlimited seats", "SSO/SAML", "Custom integrations", "SLA guarantee", "On-premise option", "Custom contract"]'::jsonb, 3)
ON CONFLICT (id) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features;
