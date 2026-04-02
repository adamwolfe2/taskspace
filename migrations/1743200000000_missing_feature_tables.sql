-- Migration: Create missing feature tables
-- Tables referenced by routes but never created: eos_health_reports, people_velocity_cache, company_digests

-- ============================================
-- EOS HEALTH REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS eos_health_reports (
  id VARCHAR(255) PRIMARY KEY,
  org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  quarter VARCHAR(50) NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}',
  overall_grade VARCHAR(5) NOT NULL DEFAULT 'C',
  ai_analysis TEXT NOT NULL DEFAULT '',
  recommendations JSONB NOT NULL DEFAULT '[]',
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eos_health_workspace ON eos_health_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_eos_health_org ON eos_health_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_eos_health_workspace_created ON eos_health_reports(workspace_id, created_at DESC);

-- ============================================
-- PEOPLE VELOCITY CACHE
-- ============================================
CREATE TABLE IF NOT EXISTS people_velocity_cache (
  id VARCHAR(255) PRIMARY KEY,
  org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT people_velocity_cache_org_user_workspace_week_key
    UNIQUE (org_id, user_id, workspace_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_people_velocity_org ON people_velocity_cache(org_id);
CREATE INDEX IF NOT EXISTS idx_people_velocity_user ON people_velocity_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_people_velocity_workspace_week ON people_velocity_cache(workspace_id, week_start DESC);

-- ============================================
-- COMPANY DIGESTS
-- ============================================
CREATE TABLE IF NOT EXISTS company_digests (
  id VARCHAR(255) PRIMARY KEY,
  org_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  period_type VARCHAR(50) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  format VARCHAR(50) NOT NULL DEFAULT 'markdown',
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_digests_workspace ON company_digests(workspace_id);
CREATE INDEX IF NOT EXISTS idx_company_digests_org ON company_digests(org_id);
CREATE INDEX IF NOT EXISTS idx_company_digests_workspace_created ON company_digests(workspace_id, created_at DESC);
