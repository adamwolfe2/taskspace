-- Migration Center: Import data from external project management tools
-- Tables: import_jobs, external_id_map, import_conflicts, import_logs

-- Import job tracking
-- Stores metadata about import operations (file, status, progress, stats)
CREATE TABLE IF NOT EXISTS import_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workspace_id TEXT REFERENCES workspaces(id), -- null = multi-workspace import
  created_by TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL, -- 'trello' | 'asana' | 'generic_csv'
  status TEXT NOT NULL DEFAULT 'uploading', -- uploading | validating | mapping | importing | completed | failed | cancelled
  progress INTEGER NOT NULL DEFAULT 0, -- 0-100
  file_url TEXT NOT NULL, -- Vercel Blob URL
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  config JSONB NOT NULL DEFAULT '{}', -- ImportConfig: workspace mappings, user mappings, entity mappings
  stats JSONB NOT NULL DEFAULT '{}', -- ImportStats: counts (workspaces, users, projects, tasks), timing
  errors JSONB[] DEFAULT '{}', -- Array of error objects: { code, message, context }
  warnings JSONB[] DEFAULT '{}', -- Array of warning objects: { code, message, context }
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  estimated_duration INTEGER, -- seconds
  source_metadata JSONB, -- Original file structure (board names, project names, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_org ON import_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by ON import_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Idempotency tracking (prevents duplicates on re-runs)
-- Maps external IDs (Trello card ID, Asana task ID) to internal TaskSpace IDs
CREATE TABLE IF NOT EXISTS external_id_map (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  import_job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'trello' | 'asana' | 'generic_csv'
  external_id TEXT NOT NULL, -- Trello card ID, Asana task ID, CSV row hash, etc.
  entity_type TEXT NOT NULL, -- 'workspace' | 'user' | 'project' | 'task'
  internal_id TEXT NOT NULL, -- TaskSpace UUID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one external ID can only map to one internal ID per org/provider/entity
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_id_unique ON external_id_map(
  organization_id, provider, external_id, entity_type
);
CREATE INDEX IF NOT EXISTS idx_external_id_internal ON external_id_map(internal_id);
CREATE INDEX IF NOT EXISTS idx_external_id_import_job ON external_id_map(import_job_id);

-- Manual conflict resolution
-- Stores ambiguous mappings that need user decision
CREATE TABLE IF NOT EXISTS import_conflicts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  import_job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL, -- 'duplicate_task' | 'ambiguous_user_mapping' | 'invalid_data' | 'missing_required_field'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'blocking' | 'warning'
  source_item JSONB NOT NULL, -- Original item that caused conflict
  potential_matches JSONB[] DEFAULT '{}', -- Array of possible TaskSpace entities that could match
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'resolved' | 'skipped'
  resolution JSONB, -- { action: 'merge' | 'skip' | 'create_new', targetId?, notes?, resolvedBy, resolvedAt }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_conflicts_job ON import_conflicts(import_job_id);
CREATE INDEX IF NOT EXISTS idx_import_conflicts_status ON import_conflicts(status);

-- Detailed audit trail
-- Stores step-by-step log of import process for debugging
CREATE TABLE IF NOT EXISTS import_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  import_job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level TEXT NOT NULL DEFAULT 'info', -- 'debug' | 'info' | 'warn' | 'error'
  stage TEXT NOT NULL, -- 'validation' | 'mapping' | 'workspace_creation' | 'task_import' | 'finalization'
  message TEXT NOT NULL,
  metadata JSONB -- Additional context: { entityId, entityType, operation, duration, ... }
);

CREATE INDEX IF NOT EXISTS idx_import_logs_job ON import_logs(import_job_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_level ON import_logs(level);
CREATE INDEX IF NOT EXISTS idx_import_logs_timestamp ON import_logs(timestamp DESC);
