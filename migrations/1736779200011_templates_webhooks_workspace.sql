/**
 * Migration: Add workspace scoping to templates and webhooks
 *
 * Purpose: Enable workspace-specific task templates and webhook configurations
 * Supports both org-wide (workspace_id = NULL) and workspace-specific templates/webhooks
 */

-- Add workspace_id to recurring_task_templates
-- NULL = org-wide template available to all workspaces
-- Non-NULL = workspace-specific template
ALTER TABLE recurring_task_templates
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to webhook_configs
-- NULL = org-wide webhook that fires for all workspace events
-- Non-NULL = workspace-specific webhook
ALTER TABLE webhook_configs
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create indexes for workspace filtering
CREATE INDEX IF NOT EXISTS idx_task_templates_workspace ON recurring_task_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_workspace ON webhook_configs(workspace_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_task_templates_org_workspace ON recurring_task_templates(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_org_workspace ON webhook_configs(organization_id, workspace_id);

-- Note: Existing records will have workspace_id = NULL (org-wide)
-- This maintains backward compatibility - existing templates/webhooks remain available org-wide
-- New workspace-specific templates/webhooks can be created by setting workspace_id
