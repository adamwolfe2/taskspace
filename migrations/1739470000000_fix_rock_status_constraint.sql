-- Migration: Add CHECK constraint for rock status column
-- This migration fixes the status enum mismatch issue found during audit
-- Date: 2026-02-14
--
-- Changes:
-- 1. Add CHECK constraint to rocks.status column to enforce valid values
-- 2. Update any legacy "off-track" values to "blocked" for consistency

-- ============================================
-- STEP 1: Update legacy "off-track" values
-- ============================================

-- Update any existing "off-track" status to "blocked"
UPDATE rocks
SET status = 'blocked'
WHERE status = 'off-track';

-- ============================================
-- STEP 2: Add CHECK constraint
-- ============================================

-- Add constraint to enforce valid status values
-- Valid values: 'on-track', 'at-risk', 'blocked', 'completed'
ALTER TABLE rocks
ADD CONSTRAINT rocks_status_check
CHECK (status IN ('on-track', 'at-risk', 'blocked', 'completed'));

-- ============================================
-- VERIFICATION
-- ============================================

-- This migration ensures:
-- 1. All existing rocks have valid status values
-- 2. Future inserts/updates must use one of the four allowed statuses
-- 3. Consistency between TypeScript types, Zod schemas, and database constraints
