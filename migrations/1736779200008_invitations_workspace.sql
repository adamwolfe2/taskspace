-- Migration: Add Workspace Assignment to Invitations
-- Enables inviting users to specific workspaces instead of just organizations

-- ============================================
-- ADD WORKSPACE_ID TO INVITATIONS
-- ============================================

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- ============================================
-- MIGRATE EXISTING INVITATIONS TO DEFAULT WORKSPACE
-- ============================================
-- For any existing pending invitations, assign them to the org's default workspace

UPDATE invitations i
SET workspace_id = w.id
FROM workspaces w
WHERE i.organization_id = w.organization_id
  AND w.is_default = TRUE
  AND i.workspace_id IS NULL
  AND i.status = 'pending';

-- ============================================
-- INDEX FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invitations_workspace
  ON invitations(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN invitations.workspace_id IS 'Workspace the invitee will be added to upon acceptance';
