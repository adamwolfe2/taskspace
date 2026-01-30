/**
 * Migration: Add workspace scoping to Google Calendar integration
 *
 * Purpose: Enable workspace-specific Google Calendar connections
 * Each workspace can have its own calendar sync configuration
 */

-- Add workspace_id to google_calendar_tokens
ALTER TABLE google_calendar_tokens
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create index for workspace filtering
CREATE INDEX IF NOT EXISTS idx_google_calendar_workspace ON google_calendar_tokens(workspace_id);

-- Composite index for token lookups (user + org + workspace)
CREATE INDEX IF NOT EXISTS idx_google_calendar_user_org_workspace
  ON google_calendar_tokens(user_id, organization_id, workspace_id);

-- Note: Existing tokens will have workspace_id = NULL
-- Users will need to re-authenticate their calendar per workspace
-- This ensures clean workspace isolation for calendar events

-- Optional: If we want to enforce unique tokens per workspace per user
-- DROP INDEX IF EXISTS google_calendar_tokens_user_id_organization_id_idx;
-- CREATE UNIQUE INDEX google_calendar_tokens_unique
--   ON google_calendar_tokens(user_id, organization_id, workspace_id);
