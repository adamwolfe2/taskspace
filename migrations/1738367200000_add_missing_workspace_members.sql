-- Migration: Add missing workspace members
-- Ensures all organization members are added to their organization's default workspace

-- Insert workspace_members entries for any organization member who doesn't have one
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
SELECT
  'wm_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 21) as id,
  w.id as workspace_id,
  tm.user_id,
  CASE
    WHEN tm.role = 'owner' THEN 'admin'
    WHEN tm.role = 'admin' THEN 'admin'
    ELSE 'member'
  END as role,
  COALESCE(tm.created_at, NOW()) as joined_at
FROM team_members tm
JOIN workspaces w ON w.organization_id = tm.organization_id AND w.is_default = true
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.user_id = tm.user_id
  AND wm.workspace_id = w.id
)
AND tm.status = 'active';
