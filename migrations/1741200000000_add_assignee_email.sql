-- Add assignee_email column to assigned_tasks
-- This column is referenced in the INSERT but was never added via migration
ALTER TABLE assigned_tasks
  ADD COLUMN IF NOT EXISTS assignee_email VARCHAR(255);
