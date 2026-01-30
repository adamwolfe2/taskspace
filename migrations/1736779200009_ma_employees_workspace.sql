/**
 * Migration: Add workspace scoping to ma_employees table
 *
 * Purpose: Enable workspace-specific org charts
 * Each workspace (company) can have its own organizational structure
 */

-- Add workspace_id column to ma_employees
ALTER TABLE ma_employees
  ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create index for workspace filtering
CREATE INDEX IF NOT EXISTS idx_ma_employees_workspace ON ma_employees(workspace_id);

-- Note: Existing ma_employees records will have workspace_id = NULL
-- They can be manually assigned to workspaces or re-seeded with workspace context
