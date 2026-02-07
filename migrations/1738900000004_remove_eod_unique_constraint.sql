-- Migration: Remove UNIQUE constraint on eod_reports to allow multiple reports per user per day
-- Date: 2026-02-07
-- Reason: The app layer allows multiple EOD reports per day but the DB constraint blocks them.
-- This causes "Failed to submit EOD report" errors when users try to re-submit.

-- Drop the unique constraint (if it exists as a named constraint)
ALTER TABLE eod_reports DROP CONSTRAINT IF EXISTS eod_reports_organization_id_user_id_date_key;

-- Also try dropping any unique index that might exist
DROP INDEX IF EXISTS eod_reports_organization_id_user_id_date_key;
DROP INDEX IF EXISTS unique_eod_user_date;

-- The existing non-unique index idx_eod_org_user_date covers lookup performance
