-- Composite indexes for frequently queried tables
-- These address N+1 and slow query patterns identified in codebase audit

CREATE INDEX IF NOT EXISTS idx_assigned_tasks_workspace_assignee_status
  ON assigned_tasks(workspace_id, assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_assigned_tasks_workspace_due_date
  ON assigned_tasks(workspace_id, org_id, due_date)
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meetings_workspace_status
  ON meetings(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_issues_workspace_status
  ON issues(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_eod_reports_org_user_date
  ON eod_reports(org_id, user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_rocks_workspace_assignee_status
  ON rocks(workspace_id, assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_scorecard_entries_metric_week
  ON scorecard_entries(metric_id, week_start);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read, created_at DESC);

-- Add workspace_id to people_velocity_cache for multi-workspace scoping
ALTER TABLE people_velocity_cache ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(255);

-- Drop old unique constraint and create workspace-scoped one
-- (wrapped in DO block for idempotency)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'people_velocity_cache_org_id_user_id_week_start_key'
  ) THEN
    ALTER TABLE people_velocity_cache
      DROP CONSTRAINT people_velocity_cache_org_id_user_id_week_start_key;
  END IF;
END $$;

ALTER TABLE people_velocity_cache
  ADD CONSTRAINT people_velocity_cache_org_user_workspace_week_key
  UNIQUE (org_id, user_id, workspace_id, week_start);
