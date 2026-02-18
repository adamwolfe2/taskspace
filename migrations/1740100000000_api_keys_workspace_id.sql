-- Migration: Add workspace_id to api_keys table
-- Enables workspace-scoped MCP API keys to prevent cross-workspace data leakage

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE SET NULL;

-- Index for efficient workspace-scoped key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace
  ON api_keys(workspace_id)
  WHERE workspace_id IS NOT NULL;
