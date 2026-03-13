-- Slack Bot Integration Tables
-- Supports Slack bot OAuth installations, user mappings, and EOD conversation tracking

-- ============================================
-- slack_installations
-- ============================================
CREATE TABLE IF NOT EXISTS slack_installations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slack_team_id TEXT NOT NULL UNIQUE,
  slack_team_name TEXT NOT NULL,
  bot_token TEXT NOT NULL,
  bot_user_id TEXT NOT NULL,
  installer_user_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_installations_organization_id ON slack_installations(organization_id);
CREATE INDEX IF NOT EXISTS idx_slack_installations_slack_team_id ON slack_installations(slack_team_id);

-- ============================================
-- slack_user_mappings
-- ============================================
CREATE TABLE IF NOT EXISTS slack_user_mappings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_email TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id),
  UNIQUE(organization_id, slack_user_id)
);

CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_organization_id ON slack_user_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_slack_user_mappings_slack_user_id ON slack_user_mappings(slack_user_id);

-- ============================================
-- slack_conversations
-- ============================================
CREATE TABLE IF NOT EXISTS slack_conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slack_user_id TEXT NOT NULL,
  slack_channel_id TEXT NOT NULL,
  workspace_id TEXT,
  state TEXT NOT NULL DEFAULT 'initiated'
    CHECK (state IN ('initiated', 'awaiting_response', 'parsing', 'confirming', 'submitted', 'cancelled', 'expired')),
  report_date TEXT NOT NULL,
  collected_text TEXT,
  parsed_report JSONB,
  rocks_context JSONB,
  message_ts TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_slack_conversations_user_state ON slack_conversations(user_id, state);
CREATE INDEX IF NOT EXISTS idx_slack_conversations_slack_user_state ON slack_conversations(slack_user_id, state);
CREATE INDEX IF NOT EXISTS idx_slack_conversations_expires_at ON slack_conversations(expires_at)
  WHERE state NOT IN ('submitted', 'cancelled', 'expired');
