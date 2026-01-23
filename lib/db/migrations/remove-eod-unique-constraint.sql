-- Migration: Remove UNIQUE constraint on eod_reports to allow multiple reports per user per day
-- Date: 2026-01-23
-- Reason: Allow users to submit multiple EOD reports for the same day without overriding

-- Drop the unique constraint (if it exists as a named constraint)
ALTER TABLE eod_reports DROP CONSTRAINT IF EXISTS eod_reports_organization_id_user_id_date_key;

-- Also try dropping any unique index that might exist
DROP INDEX IF EXISTS eod_reports_organization_id_user_id_date_key;
DROP INDEX IF EXISTS unique_eod_user_date;

-- Add a new index for efficient lookups (non-unique) if not already covered
-- The idx_eod_org_user_date already exists and is non-unique, so we're good

-- Verify the change (this is informational, comment out if running as script)
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'eod_reports';
