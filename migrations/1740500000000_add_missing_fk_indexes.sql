-- Migration: Add missing indexes on foreign key columns
-- These indexes prevent sequential scans on frequently-queried FK columns
-- All use IF NOT EXISTS for safe re-runs

-- ============================================
-- P0: Required FKs used in core query paths
-- ============================================

-- password_reset_tokens: lookup by user
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id
  ON password_reset_tokens(user_id);

-- api_keys: lookup by creator
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by
  ON api_keys(created_by);

-- organization_subscriptions: filter/join by tier
CREATE INDEX IF NOT EXISTS idx_org_subscriptions_tier_id
  ON organization_subscriptions(tier_id);

-- scheduled_reports: list by creator
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by
  ON scheduled_reports(created_by);

-- ============================================
-- P1: Other required/high-traffic FKs
-- ============================================

-- recurring_task_templates: filter by creator and assignee
CREATE INDEX IF NOT EXISTS idx_recurring_templates_created_by
  ON recurring_task_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_recurring_templates_default_assignee
  ON recurring_task_templates(default_assignee_id)
  WHERE default_assignee_id IS NOT NULL;

-- scorecard_metrics: filter by creator
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_created_by
  ON scorecard_metrics(created_by);

-- meetings: filter by creator
CREATE INDEX IF NOT EXISTS idx_meetings_created_by
  ON meetings(created_by);

-- issues: filter by creator
CREATE INDEX IF NOT EXISTS idx_issues_created_by
  ON issues(created_by);

-- projects: filter by creator
CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON projects(created_by);

-- clients: filter by creator
CREATE INDEX IF NOT EXISTS idx_clients_created_by
  ON clients(created_by);

-- weekly_metric_entries: metric history queries
CREATE INDEX IF NOT EXISTS idx_weekly_metric_entries_metric_id
  ON weekly_metric_entries(metric_id);

-- ============================================
-- P2: Optional FKs on frequent query paths
-- ============================================

-- user_organization_preferences: user routing on login
CREATE INDEX IF NOT EXISTS idx_user_prefs_last_org
  ON user_organization_preferences(last_organization_id)
  WHERE last_organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_prefs_default_org
  ON user_organization_preferences(default_organization_id)
  WHERE default_organization_id IS NOT NULL;

-- ai_suggestions: workspace filtering and review workflow
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_workspace
  ON ai_suggestions(workspace_id)
  WHERE workspace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_reviewed_by
  ON ai_suggestions(reviewed_by)
  WHERE reviewed_by IS NOT NULL;

-- meeting_todos: issue-to-todo and task conversion lookups
CREATE INDEX IF NOT EXISTS idx_meeting_todos_issue_id
  ON meeting_todos(issue_id)
  WHERE issue_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_todos_task_id
  ON meeting_todos(task_id)
  WHERE task_id IS NOT NULL;

-- rock_checkins: user progress tracking
CREATE INDEX IF NOT EXISTS idx_rock_checkins_user_id
  ON rock_checkins(user_id);

-- focus_blocks: task/rock time correlation
CREATE INDEX IF NOT EXISTS idx_focus_blocks_task_id
  ON focus_blocks(task_id)
  WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_focus_blocks_rock_id
  ON focus_blocks(rock_id)
  WHERE rock_id IS NOT NULL;

-- scorecard_entries: audit trail by entry author
CREATE INDEX IF NOT EXISTS idx_scorecard_entries_entered_by
  ON scorecard_entries(entered_by);

-- audit_logs: lookup by actor
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON audit_logs(actor_id)
  WHERE actor_id IS NOT NULL;

-- import_jobs: workspace filtering
CREATE INDEX IF NOT EXISTS idx_import_jobs_workspace
  ON import_jobs(workspace_id)
  WHERE workspace_id IS NOT NULL;

-- billing_history: subscription audit trail
CREATE INDEX IF NOT EXISTS idx_billing_history_subscription_id
  ON billing_history(subscription_id)
  WHERE subscription_id IS NOT NULL;

-- pending_subscriptions: claim tracking
CREATE INDEX IF NOT EXISTS idx_pending_subs_claimed_org
  ON pending_subscriptions(claimed_by_org_id)
  WHERE claimed_by_org_id IS NOT NULL;
