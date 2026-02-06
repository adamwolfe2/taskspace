-- Performance indexes for N+1 query optimization and common query patterns
-- These indexes cover the most frequently used WHERE, JOIN, and ORDER BY clauses

-- ============================================
-- eod_reports: Heavily queried by org+date, user+org, and date ranges
-- ============================================

-- Used by: findByOrganizationAndDate (cron jobs, digest generation)
-- This is the most critical index - cron routes were loading ALL reports just to filter by date
CREATE INDEX IF NOT EXISTS idx_eod_reports_org_date
  ON eod_reports (organization_id, date DESC);

-- Used by: findByUserId, findByUserAndDate, findByUserIdsWithDateRange
CREATE INDEX IF NOT EXISTS idx_eod_reports_user_org
  ON eod_reports (user_id, organization_id, date DESC);

-- Used by: findByOrganizationId with workspace filter
CREATE INDEX IF NOT EXISTS idx_eod_reports_org_workspace
  ON eod_reports (organization_id, workspace_id) WHERE workspace_id IS NOT NULL;

-- Used by: MCP workload analysis - escalation counting
CREATE INDEX IF NOT EXISTS idx_eod_reports_escalation
  ON eod_reports (user_id, needs_escalation, date)
  WHERE needs_escalation = true;

-- ============================================
-- assigned_tasks: Queried by org, assignee, status, and date ranges
-- ============================================

-- Used by: findByOrganizationId (export, dashboard metrics)
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_org
  ON assigned_tasks (organization_id, created_at DESC);

-- Used by: findByAssigneeId, findByUserIds, MCP workload analysis
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_assignee_org
  ON assigned_tasks (assignee_id, organization_id, status);

-- Used by: findByOrganizationId with workspace filter
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_org_workspace
  ON assigned_tasks (organization_id, workspace_id) WHERE workspace_id IS NOT NULL;

-- Used by: dashboard metrics - filtering completed vs pending tasks
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_status
  ON assigned_tasks (organization_id, status, completed_at);

-- Used by: overdue task detection in manager dashboard
CREATE INDEX IF NOT EXISTS idx_assigned_tasks_due_date
  ON assigned_tasks (due_date, status) WHERE status != 'completed';

-- ============================================
-- rocks: Queried by org, user, status, and quarter
-- ============================================

-- Used by: findByOrganizationId (export, digest generation)
CREATE INDEX IF NOT EXISTS idx_rocks_org
  ON rocks (organization_id, created_at DESC);

-- Used by: findByUserId, findByUserIds
CREATE INDEX IF NOT EXISTS idx_rocks_user_org
  ON rocks (user_id, organization_id);

-- Used by: findByOrganizationId with workspace filter
CREATE INDEX IF NOT EXISTS idx_rocks_org_workspace
  ON rocks (organization_id, workspace_id) WHERE workspace_id IS NOT NULL;

-- Used by: MCP workload analysis - active rock filtering
CREATE INDEX IF NOT EXISTS idx_rocks_status
  ON rocks (organization_id, status) WHERE status IN ('on-track', 'at-risk', 'blocked');

-- ============================================
-- organization_members: Core lookup table for most operations
-- ============================================

-- Used by: findByOrganizationId, findWithUsersByOrganizationId
CREATE INDEX IF NOT EXISTS idx_org_members_org
  ON organization_members (organization_id, status);

-- Used by: findByUserId, findByOrgAndUser
CREATE INDEX IF NOT EXISTS idx_org_members_user
  ON organization_members (user_id) WHERE user_id IS NOT NULL;

-- Used by: findByOrgAndEmail
CREATE INDEX IF NOT EXISTS idx_org_members_email
  ON organization_members (organization_id, email);

-- Used by: findDirectReports (manager dashboard)
CREATE INDEX IF NOT EXISTS idx_org_members_manager
  ON organization_members (organization_id, manager_id, status)
  WHERE manager_id IS NOT NULL;

-- ============================================
-- sessions: Queried by token and user_id
-- ============================================

-- Used by: findByToken (every authenticated request)
CREATE INDEX IF NOT EXISTS idx_sessions_token
  ON sessions (token);

-- Used by: findByUserId, deleteByUserId (password reset)
CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions (user_id);

-- Used by: deleteExpired
CREATE INDEX IF NOT EXISTS idx_sessions_expires
  ON sessions (expires_at) WHERE expires_at < NOW();

-- ============================================
-- eod_insights: Queried by report ID and org
-- ============================================

-- Used by: findByEODReportId, findByReportIds
CREATE INDEX IF NOT EXISTS idx_eod_insights_report
  ON eod_insights (eod_report_id);

-- Used by: findByOrganizationId, findRecentByOrganization
CREATE INDEX IF NOT EXISTS idx_eod_insights_org
  ON eod_insights (organization_id, processed_at DESC);

-- ============================================
-- invitations: Queried by org, email, and status
-- ============================================

-- Used by: findByOrganizationId
CREATE INDEX IF NOT EXISTS idx_invitations_org
  ON invitations (organization_id, created_at DESC);

-- Used by: findPendingByEmail (bulk invite optimization)
CREATE INDEX IF NOT EXISTS idx_invitations_email_status
  ON invitations (email, status) WHERE status = 'pending';

-- ============================================
-- daily_digests: Queried by org and date
-- ============================================

-- Used by: findByDate, getLatest
CREATE INDEX IF NOT EXISTS idx_daily_digests_org_date
  ON daily_digests (organization_id, digest_date DESC);

-- ============================================
-- rock_milestones: Queried by rock_id
-- ============================================

-- Used by: findByRockId
CREATE INDEX IF NOT EXISTS idx_rock_milestones_rock
  ON rock_milestones (rock_id, position);

-- ============================================
-- notifications: Already has some indexes, adding missing ones
-- ============================================

-- Used by: findByUserId with ordering
CREATE INDEX IF NOT EXISTS idx_notifications_user_org
  ON notifications (user_id, organization_id, created_at DESC);

-- ============================================
-- audit_logs: Queried by org and date ranges
-- ============================================

-- Used by: fetchAuditLogs in export route
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_date
  ON audit_logs (organization_id, created_at DESC);
