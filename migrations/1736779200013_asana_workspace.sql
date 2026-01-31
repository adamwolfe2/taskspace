/**
 * Migration: Add workspace scoping to Asana integration
 *
 * Purpose: Enable workspace-specific Asana connections
 * Currently Asana credentials are stored in organization_members table (asana_pat, asana_workspace_gid).
 * This creates a dedicated table for workspace-specific Asana connections.
 */

-- Create asana_connections table for workspace-specific Asana integrations
CREATE TABLE IF NOT EXISTS asana_connections (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id VARCHAR(255) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Asana credentials
  personal_access_token TEXT NOT NULL,
  asana_workspace_gid VARCHAR(255),

  -- Sync metadata
  last_sync_at TIMESTAMP,
  sync_enabled BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure one connection per user per workspace
  UNIQUE(user_id, workspace_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_asana_connections_workspace ON asana_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_asana_connections_user ON asana_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_asana_connections_org_workspace ON asana_connections(organization_id, workspace_id);

-- Note: Existing asana_pat and asana_workspace_gid in organization_members table remain for backward compatibility
-- New workspace-specific connections should use this table
-- Future: Migrate existing connections to this table or deprecate old columns
