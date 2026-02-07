-- ============================================
-- NOTIFICATIONS TABLE ENHANCEMENTS
-- ============================================
-- Adds workspace_id, link, and read_at columns
-- Adds new notification types: task_completed, mention, meeting_starting, issue_created
-- Adds optimized composite index for user unread queries

-- Add workspace_id column for workspace-scoped notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255);

-- Add link column for navigation targets (separate from action_url for clarity)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(500);

-- Add read_at timestamp to track when notification was read
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Optimized composite index for unread notifications per user (replaces less efficient indexes)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read, created_at DESC);

-- Index for workspace-scoped notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_workspace
  ON notifications(workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;

-- Index for org-scoped queries (improved version with created_at ordering)
CREATE INDEX IF NOT EXISTS idx_notifications_org_created
  ON notifications(organization_id, created_at DESC);
