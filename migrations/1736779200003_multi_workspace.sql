-- Migration: Multi-Workspace Architecture
-- Part of SESSION 5: Multi-Workspace Architecture
-- Enables workspace-level scoping for EOS features (departments/teams)

-- ============================================
-- WORKSPACES TABLE
-- ============================================
-- A workspace represents a logical grouping within an organization
-- (e.g., department, team, project, business unit)

CREATE TABLE IF NOT EXISTS workspaces (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'team',  -- 'leadership', 'department', 'team', 'project'
  description TEXT,
  settings JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique slug within organization
  UNIQUE(organization_id, slug)
);

-- ============================================
-- WORKSPACE MEMBERS TABLE
-- ============================================
-- Maps users to workspaces with their role in that workspace

CREATE TABLE IF NOT EXISTS workspace_members (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',  -- 'owner', 'admin', 'member', 'viewer'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate membership
  UNIQUE(workspace_id, user_id)
);

-- ============================================
-- ADD WORKSPACE_ID TO EXISTING TABLES
-- ============================================

-- Add workspace_id to rocks table
ALTER TABLE rocks
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to assigned_tasks table
ALTER TABLE assigned_tasks
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to eod_reports table
ALTER TABLE eod_reports
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to ai_suggestions table
ALTER TABLE ai_suggestions
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============================================
-- INDEXES
-- ============================================

-- Workspace queries
CREATE INDEX IF NOT EXISTS idx_workspaces_org
  ON workspaces(organization_id);

CREATE INDEX IF NOT EXISTS idx_workspaces_org_default
  ON workspaces(organization_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_workspaces_org_slug
  ON workspaces(organization_id, slug);

-- Workspace member queries
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace
  ON workspace_members(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user_workspace
  ON workspace_members(user_id, workspace_id);

-- Workspace filtering on existing tables
CREATE INDEX IF NOT EXISTS idx_rocks_workspace
  ON rocks(workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assigned_tasks_workspace
  ON assigned_tasks(workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_eod_reports_workspace
  ON eod_reports(workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_workspace
  ON ai_suggestions(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- ============================================
-- DATA MIGRATION: CREATE DEFAULT WORKSPACES
-- ============================================
-- Create a default workspace for each existing organization
-- and migrate existing data to it

-- Step 1: Create default workspace for each org that doesn't have one
INSERT INTO workspaces (id, organization_id, name, slug, type, is_default, description)
SELECT
  gen_random_uuid()::text,
  o.id,
  'Default',
  'default',
  'team',
  TRUE,
  'Default workspace for all organization members'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM workspaces w
  WHERE w.organization_id = o.id AND w.is_default = TRUE
);

-- Step 2: Add all org members to their default workspace
INSERT INTO workspace_members (workspace_id, user_id, role)
SELECT
  w.id,
  om.user_id,
  CASE
    WHEN om.role IN ('owner', 'admin') THEN 'admin'
    ELSE 'member'
  END
FROM organization_members om
JOIN workspaces w ON w.organization_id = om.organization_id AND w.is_default = TRUE
WHERE om.user_id IS NOT NULL
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Step 3: Migrate existing rocks to default workspace
UPDATE rocks r
SET workspace_id = w.id
FROM workspaces w
WHERE r.organization_id = w.organization_id
  AND w.is_default = TRUE
  AND r.workspace_id IS NULL;

-- Step 4: Migrate existing tasks to default workspace
UPDATE assigned_tasks t
SET workspace_id = w.id
FROM workspaces w
WHERE t.organization_id = w.organization_id
  AND w.is_default = TRUE
  AND t.workspace_id IS NULL;

-- Step 5: Migrate existing eod_reports to default workspace
UPDATE eod_reports e
SET workspace_id = w.id
FROM workspaces w
WHERE e.organization_id = w.organization_id
  AND w.is_default = TRUE
  AND e.workspace_id IS NULL;

-- Step 6: Migrate existing ai_suggestions to default workspace
UPDATE ai_suggestions s
SET workspace_id = w.id
FROM workspaces w
WHERE s.organization_id = w.organization_id
  AND w.is_default = TRUE
  AND s.workspace_id IS NULL;

-- ============================================
-- SQL FUNCTIONS
-- ============================================

-- Function to get all workspaces a user has access to
CREATE OR REPLACE FUNCTION get_user_workspaces(p_user_id VARCHAR)
RETURNS TABLE (
  id VARCHAR(255),
  organization_id VARCHAR(255),
  name VARCHAR(255),
  slug VARCHAR(255),
  type VARCHAR(50),
  description TEXT,
  settings JSONB,
  is_default BOOLEAN,
  member_role VARCHAR(50),
  member_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.organization_id,
    w.name,
    w.slug,
    w.type,
    w.description,
    w.settings,
    w.is_default,
    wm.role as member_role,
    (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id) as member_count,
    w.created_at
  FROM workspaces w
  JOIN workspace_members wm ON wm.workspace_id = w.id
  WHERE wm.user_id = p_user_id
  ORDER BY w.is_default DESC, w.name ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a user has access to a workspace
CREATE OR REPLACE FUNCTION user_has_workspace_access(
  p_user_id VARCHAR,
  p_workspace_id VARCHAR,
  p_required_role VARCHAR DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_role VARCHAR(50);
  v_role_priority INTEGER;
  v_required_priority INTEGER;
BEGIN
  -- Get user's role in the workspace
  SELECT wm.role INTO v_role
  FROM workspace_members wm
  WHERE wm.workspace_id = p_workspace_id AND wm.user_id = p_user_id;

  -- No membership found
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- No specific role required, just check membership
  IF p_required_role IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check role hierarchy: owner > admin > member > viewer
  v_role_priority := CASE v_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  v_required_priority := CASE p_required_role
    WHEN 'owner' THEN 4
    WHEN 'admin' THEN 3
    WHEN 'member' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN v_role_priority >= v_required_priority;
END;
$$ LANGUAGE plpgsql;

-- Function to get workspace member count
CREATE OR REPLACE FUNCTION get_workspace_member_count(p_workspace_id VARCHAR)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM workspace_members
    WHERE workspace_id = p_workspace_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get default workspace for an organization
CREATE OR REPLACE FUNCTION get_default_workspace(p_org_id VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT id
    FROM workspaces
    WHERE organization_id = p_org_id AND is_default = TRUE
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp for workspaces
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_updated_at ON workspaces;
CREATE TRIGGER workspace_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspace_timestamp();

-- Ensure only one default workspace per organization
CREATE OR REPLACE FUNCTION enforce_single_default_workspace()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE workspaces
    SET is_default = FALSE
    WHERE organization_id = NEW.organization_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_single_default ON workspaces;
CREATE TRIGGER enforce_single_default
  BEFORE INSERT OR UPDATE OF is_default ON workspaces
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION enforce_single_default_workspace();
