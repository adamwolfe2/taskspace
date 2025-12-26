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
CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  department VARCHAR(255) DEFAULT 'General',
  weekly_measurable TEXT,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_by VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  UNIQUE(organization_id, user_id)
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EOD Reports table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id, date)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_user_id ON organization_members(user_id);
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
