-- Migration: Add Foreign Key Constraints and Missing Indexes
-- This migration addresses critical database integrity issues found during audit
-- Date: 2026-02-13
--
-- Changes:
-- 1. Add foreign key constraints to assigned_tasks table
-- 2. Add missing indexes on foreign key columns
-- 3. Add foreign keys to other core tables (rocks, eod_reports)
-- 4. Clean up any orphaned records before adding constraints

-- ============================================
-- STEP 1: Clean up orphaned records
-- ============================================

-- Clean up assigned_tasks with invalid rock_id
UPDATE assigned_tasks
SET rock_id = NULL
WHERE rock_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM rocks WHERE rocks.id = assigned_tasks.rock_id);

-- Clean up assigned_tasks with invalid eod_report_id
UPDATE assigned_tasks
SET eod_report_id = NULL
WHERE eod_report_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM eod_reports WHERE eod_reports.id = assigned_tasks.eod_report_id);

-- Clean up assigned_tasks with invalid assigned_by_id
UPDATE assigned_tasks
SET assigned_by_id = NULL
WHERE assigned_by_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM organization_members WHERE organization_members.user_id = assigned_tasks.assigned_by_id);

-- Delete assigned_tasks with invalid organization_id (critical - can't set null)
DELETE FROM assigned_tasks
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE organizations.id = assigned_tasks.organization_id);

-- Delete assigned_tasks with invalid assignee_id (critical - can't set null as it's NOT NULL)
DELETE FROM assigned_tasks
WHERE NOT EXISTS (SELECT 1 FROM organization_members WHERE organization_members.user_id = assigned_tasks.assignee_id);

-- Clean up rocks with invalid organization_id
DELETE FROM rocks
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE organizations.id = rocks.organization_id);

-- Clean up rocks with invalid user_id
DELETE FROM rocks
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = rocks.user_id);

-- Clean up eod_reports with invalid organization_id
DELETE FROM eod_reports
WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE organizations.id = eod_reports.organization_id);

-- Clean up eod_reports with invalid user_id
DELETE FROM eod_reports
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.id = eod_reports.user_id);

-- ============================================
-- STEP 2: Add missing indexes (before foreign keys)
-- ============================================

-- Indexes for assigned_tasks foreign keys
CREATE INDEX IF NOT EXISTS idx_tasks_rock_id ON assigned_tasks(rock_id) WHERE rock_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON assigned_tasks(assigned_by_id) WHERE assigned_by_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_eod_report ON assigned_tasks(eod_report_id) WHERE eod_report_id IS NOT NULL;

-- Indexes for rocks foreign keys
CREATE INDEX IF NOT EXISTS idx_rocks_org_fk ON rocks(organization_id);
CREATE INDEX IF NOT EXISTS idx_rocks_user_fk ON rocks(user_id);

-- Indexes for eod_reports foreign keys
CREATE INDEX IF NOT EXISTS idx_eod_org_fk ON eod_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_eod_user_fk ON eod_reports(user_id);

-- ============================================
-- STEP 3: Add foreign key constraints
-- ============================================

-- assigned_tasks foreign keys
-- Note: Using ON DELETE SET NULL for optional references, CASCADE for required ones

-- Organization (required - cascade delete)
ALTER TABLE assigned_tasks
ADD CONSTRAINT fk_tasks_organization
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

-- Assignee (required - cascade delete when user is removed from org)
-- Note: This references users.id, not organization_members.id
ALTER TABLE assigned_tasks
ADD CONSTRAINT fk_tasks_assignee
FOREIGN KEY (assignee_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Rock (optional - unlink if rock deleted)
ALTER TABLE assigned_tasks
ADD CONSTRAINT fk_tasks_rock
FOREIGN KEY (rock_id)
REFERENCES rocks(id)
ON DELETE SET NULL;

-- EOD Report (optional - unlink if report deleted)
ALTER TABLE assigned_tasks
ADD CONSTRAINT fk_tasks_eod_report
FOREIGN KEY (eod_report_id)
REFERENCES eod_reports(id)
ON DELETE SET NULL;

-- Assigned by (optional - unlink if assigner removed)
ALTER TABLE assigned_tasks
ADD CONSTRAINT fk_tasks_assigned_by
FOREIGN KEY (assigned_by_id)
REFERENCES users(id)
ON DELETE SET NULL;

-- rocks foreign keys
ALTER TABLE rocks
ADD CONSTRAINT fk_rocks_organization
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

ALTER TABLE rocks
ADD CONSTRAINT fk_rocks_user
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- eod_reports foreign keys
ALTER TABLE eod_reports
ADD CONSTRAINT fk_eod_organization
FOREIGN KEY (organization_id)
REFERENCES organizations(id)
ON DELETE CASCADE;

ALTER TABLE eod_reports
ADD CONSTRAINT fk_eod_user
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- ============================================
-- STEP 4: Add indexes for improved query performance
-- ============================================

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_org_rock ON assigned_tasks(organization_id, rock_id) WHERE rock_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_rock ON assigned_tasks(assignee_id, rock_id) WHERE rock_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rocks_quarter_user ON rocks(quarter, user_id) WHERE quarter IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_eod_date_user ON eod_reports(date DESC, user_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- This migration will fail if:
-- 1. Orphaned records still exist after cleanup
-- 2. Constraint names conflict (shouldn't happen with IF NOT EXISTS on indexes)
-- 3. Data types don't match between referencing and referenced columns

-- Success criteria:
-- - All foreign keys added successfully
-- - All indexes created
-- - No orphaned records remain
-- - Database integrity enforced at schema level
