/**
 * Migration: Add workspace scoping to productivity tables
 *
 * Purpose: Enable workspace-specific productivity tracking
 * CRITICAL: Prevents data leakage across workspaces for focus blocks,
 * energy tracking, streaks, and focus scores.
 */

-- Add workspace_id to focus_blocks
ALTER TABLE focus_blocks
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to daily_energy
ALTER TABLE daily_energy
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Add workspace_id to user_streaks
ALTER TABLE user_streaks
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to focus_score_history
ALTER TABLE focus_score_history
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Create indexes for efficient workspace filtering
CREATE INDEX IF NOT EXISTS idx_focus_blocks_workspace ON focus_blocks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_daily_energy_workspace ON daily_energy(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_workspace ON user_streaks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_focus_score_history_workspace ON focus_score_history(workspace_id);

-- Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_focus_blocks_user_workspace ON focus_blocks(user_id, workspace_id, start_time);
CREATE INDEX IF NOT EXISTS idx_daily_energy_user_workspace ON daily_energy(user_id, workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_workspace ON user_streaks(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_focus_score_user_workspace ON focus_score_history(user_id, workspace_id, date);

-- Note: Existing records will have workspace_id = NULL
-- They should be manually assigned to appropriate workspaces or filtered out
-- For SET NULL: Old data remains but won't show in workspace-filtered views
-- For CASCADE: Deletion of workspace will delete associated productivity data
