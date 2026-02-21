-- Add updated_at column to organization_members table
-- This allows tracking when member records were last modified

ALTER TABLE organization_members
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Backfill: set updated_at = joined_at for existing rows
UPDATE organization_members SET updated_at = joined_at WHERE updated_at IS NULL;
