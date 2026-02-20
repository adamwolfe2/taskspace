-- Add soft-delete support to organizations
-- Instead of hard-deleting orgs, we archive them
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for filtering out archived orgs efficiently
CREATE INDEX IF NOT EXISTS idx_organizations_archived ON organizations(archived_at) WHERE archived_at IS NULL;
