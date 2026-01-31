-- Migration: Fix get_user_workspaces function
-- Adds missing columns that were added in workspace branding migration

-- Drop and recreate the function with all required columns
DROP FUNCTION IF EXISTS get_user_workspaces(VARCHAR);

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
  created_by VARCHAR(255),
  -- Workspace branding fields
  logo_url VARCHAR(500),
  primary_color VARCHAR(50),
  secondary_color VARCHAR(50),
  accent_color VARCHAR(50),
  favicon_url VARCHAR(500),
  -- Member info
  member_role VARCHAR(50),
  member_count BIGINT,
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
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
    w.created_by,
    w.logo_url,
    w.primary_color,
    w.secondary_color,
    w.accent_color,
    w.favicon_url,
    wm.role as member_role,
    (SELECT COUNT(*) FROM workspace_members wm2 WHERE wm2.workspace_id = w.id) as member_count,
    w.created_at,
    w.updated_at
  FROM workspaces w
  JOIN workspace_members wm ON wm.workspace_id = w.id
  WHERE wm.user_id = p_user_id
  ORDER BY w.is_default DESC, w.name ASC;
END;
$$ LANGUAGE plpgsql;
