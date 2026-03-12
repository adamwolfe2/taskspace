CREATE TABLE IF NOT EXISTS task_pool (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'medium', 'normal')),
  created_by_id TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  claimed_by_id TEXT,
  claimed_by_name TEXT,
  claimed_at TIMESTAMPTZ,
  claimed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_pool_workspace ON task_pool(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_pool_org ON task_pool(organization_id);
