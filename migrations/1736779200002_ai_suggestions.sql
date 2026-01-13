-- Migration: AI Suggestions and Budget Controls
-- Part of SESSION 4A: AI Inbox with Budget Controls

-- ============================================
-- AI SUGGESTIONS TABLE
-- ============================================
-- Unified table for all AI-generated suggestions that require human review

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Source tracking (where the suggestion came from)
  source_type VARCHAR(50) NOT NULL,  -- 'eod_report', 'brain_dump', 'digest', 'query', 'scheduled'
  source_id VARCHAR(255),            -- ID of the source entity
  source_text TEXT,                  -- Excerpt of source content for display

  -- Suggestion content
  suggestion_type VARCHAR(50) NOT NULL,  -- 'task', 'follow_up', 'blocker', 'alert', 'rock_update'
  title VARCHAR(500) NOT NULL,
  description TEXT,
  suggested_data JSONB NOT NULL DEFAULT '{}',  -- Full structured data for the suggestion
  context TEXT,                       -- AI reasoning for the suggestion
  confidence DECIMAL(3,2) DEFAULT 0.75,  -- 0.00-1.00 confidence score
  priority VARCHAR(20) DEFAULT 'medium',  -- 'low', 'medium', 'high', 'urgent'

  -- Target assignment
  target_user_id VARCHAR(255),
  target_user_name VARCHAR(255),
  related_entity_type VARCHAR(50),   -- 'task', 'rock', 'eod_report', etc.
  related_entity_id VARCHAR(255),

  -- Status and approval workflow
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'auto_applied', 'expired'
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  action_taken JSONB,  -- What was created when approved (e.g., {"taskId": "xxx"})

  -- Budget tracking
  credits_cost INTEGER NOT NULL DEFAULT 0,  -- Credits that will be deducted on approval

  -- Lifecycle
  expires_at TIMESTAMP WITH TIME ZONE,  -- Auto-expire old suggestions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- AI BUDGET SETTINGS TABLE
-- ============================================
-- Per-organization AI budget and auto-approval settings

CREATE TABLE IF NOT EXISTS ai_budget_settings (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- Budget settings
  monthly_budget_credits INTEGER DEFAULT 1000,
  warning_threshold_percent INTEGER DEFAULT 80,
  pause_on_budget_exceeded BOOLEAN DEFAULT TRUE,

  -- Auto-approval settings
  auto_approve_enabled BOOLEAN DEFAULT FALSE,
  auto_approve_min_confidence DECIMAL(3,2) DEFAULT 0.90,
  auto_approve_types JSONB DEFAULT '[]',  -- Which suggestion types to auto-approve

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org_status
  ON ai_suggestions(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_org_pending
  ON ai_suggestions(organization_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_source
  ON ai_suggestions(source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_target
  ON ai_suggestions(target_user_id)
  WHERE target_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type
  ON ai_suggestions(organization_id, suggestion_type);

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_expires
  ON ai_suggestions(expires_at)
  WHERE expires_at IS NOT NULL AND status = 'pending';

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to get pending suggestion count
CREATE OR REPLACE FUNCTION get_pending_suggestions_count(org_id VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM ai_suggestions
    WHERE organization_id = org_id
      AND status = 'pending'
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire old suggestions
CREATE OR REPLACE FUNCTION expire_old_suggestions()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE ai_suggestions
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get suggestion stats for an organization
CREATE OR REPLACE FUNCTION get_suggestion_stats(org_id VARCHAR)
RETURNS TABLE (
  pending_count INTEGER,
  approved_today INTEGER,
  rejected_today INTEGER,
  auto_applied_today INTEGER,
  credits_used_today INTEGER,
  avg_confidence DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INTEGER FROM ai_suggestions
     WHERE organization_id = org_id AND status = 'pending')::INTEGER as pending_count,
    (SELECT COUNT(*)::INTEGER FROM ai_suggestions
     WHERE organization_id = org_id AND status = 'approved'
     AND reviewed_at >= CURRENT_DATE)::INTEGER as approved_today,
    (SELECT COUNT(*)::INTEGER FROM ai_suggestions
     WHERE organization_id = org_id AND status = 'rejected'
     AND reviewed_at >= CURRENT_DATE)::INTEGER as rejected_today,
    (SELECT COUNT(*)::INTEGER FROM ai_suggestions
     WHERE organization_id = org_id AND status = 'auto_applied'
     AND reviewed_at >= CURRENT_DATE)::INTEGER as auto_applied_today,
    (SELECT COALESCE(SUM(credits_cost), 0)::INTEGER FROM ai_suggestions
     WHERE organization_id = org_id
     AND status IN ('approved', 'auto_applied')
     AND reviewed_at >= CURRENT_DATE)::INTEGER as credits_used_today,
    (SELECT AVG(confidence)::DECIMAL(3,2) FROM ai_suggestions
     WHERE organization_id = org_id AND status = 'pending')::DECIMAL(3,2) as avg_confidence;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_ai_suggestions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_suggestions_updated_at ON ai_suggestions;
CREATE TRIGGER ai_suggestions_updated_at
  BEFORE UPDATE ON ai_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_suggestions_timestamp();

DROP TRIGGER IF EXISTS ai_budget_settings_updated_at ON ai_budget_settings;
CREATE TRIGGER ai_budget_settings_updated_at
  BEFORE UPDATE ON ai_budget_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_suggestions_timestamp();
