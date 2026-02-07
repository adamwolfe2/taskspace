-- Migration: Add performance indexes for common query patterns
-- Date: 2026-02-07

-- ============================================
-- ROCKS INDEXES
-- ============================================
-- Most queries filter by (organization_id, workspace_id) and optionally status
CREATE INDEX IF NOT EXISTS idx_rocks_org ON rocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_rocks_workspace ON rocks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rocks_org_workspace ON rocks(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_rocks_user ON rocks(user_id);
CREATE INDEX IF NOT EXISTS idx_rocks_status ON rocks(status);
CREATE INDEX IF NOT EXISTS idx_rocks_quarter ON rocks(quarter);

-- ============================================
-- ASSIGNED TASKS INDEXES
-- ============================================
-- Tasks are queried by org+workspace, assignee, status, and due date
CREATE INDEX IF NOT EXISTS idx_tasks_org ON assigned_tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON assigned_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org_workspace ON assigned_tasks(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON assigned_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON assigned_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON assigned_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON assigned_tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_rock ON assigned_tasks(rock_id);

-- ============================================
-- EOD REPORTS INDEXES
-- ============================================
-- Reports are queried by org+workspace, user+date, and date ranges
CREATE INDEX IF NOT EXISTS idx_eod_org ON eod_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_eod_workspace ON eod_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_eod_org_workspace ON eod_reports(organization_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_eod_user ON eod_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_eod_date ON eod_reports(date DESC);
CREATE INDEX IF NOT EXISTS idx_eod_user_date ON eod_reports(user_id, date DESC);

-- ============================================
-- ISSUES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_issues_workspace ON issues(workspace_id);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_workspace_status ON issues(workspace_id, status);

-- ============================================
-- SCORECARD INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_workspace ON scorecard_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_metrics_owner ON scorecard_metrics(owner_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_entries_metric ON scorecard_entries(metric_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_entries_week ON scorecard_entries(week_start);

-- ============================================
-- ORGANIZATION MEMBERS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON organization_members(status);

-- ============================================
-- SESSIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================
-- WORKSPACE MEMBERS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);

-- ============================================
-- MEETING TODOS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_meeting_todos_meeting ON meeting_todos(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_todos_assignee ON meeting_todos(assignee_id);

-- ============================================
-- MENTIONS INDEXES (table does not exist yet - uncomment when created)
-- ============================================
-- CREATE INDEX IF NOT EXISTS idx_mentions_target ON mentions(target_user_id);
-- CREATE INDEX IF NOT EXISTS idx_mentions_entity ON mentions(entity_type, entity_id);

-- ============================================
-- NOTIFICATIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- ============================================
-- TASK SUBTASKS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON task_subtasks(task_id);
-- Note: task_subtasks does not have workspace_id column - inherited via assigned_tasks FK

-- ============================================
-- INVITATIONS INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invitations_org ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- ============================================
-- IDS BOARD ITEMS INDEXES (already exists for workspace but add more)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ids_board_created_by ON ids_board_items(created_by);
-- Note: ids_board_items does not have meeting_id column

-- ============================================
-- VTO DOCUMENTS INDEXES (table does not exist yet - uncomment when created)
-- ============================================
-- CREATE INDEX IF NOT EXISTS idx_vto_documents_org ON vto_documents(organization_id);

-- ============================================
-- PEOPLE ASSESSMENTS (already has workspace + employee + assessor)
-- ============================================
-- Already indexed

-- ============================================
-- ROCK MILESTONES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rock_milestones_rock ON rock_milestones(rock_id);
