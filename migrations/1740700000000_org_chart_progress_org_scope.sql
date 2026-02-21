-- Migration: Add organization_id to org_chart_rock_progress
-- Prevents cross-organization data leakage in org chart rock progress tracking.
-- Previously the table had no org/workspace scoping, allowing any authenticated
-- user to read or modify any employee's progress data across all organizations.

-- Step 1: Add organization_id column (nullable initially for safe migration)
ALTER TABLE org_chart_rock_progress
  ADD COLUMN IF NOT EXISTS organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 2: Populate existing rows with a placeholder org_id.
-- Existing data is unscoped and can't be reliably attributed to an org.
-- We leave them as NULL (orphaned) so they won't appear in any org's queries
-- once the NOT NULL constraint is enforced in application logic.
-- (No org currently relies on this data being correct since the feature is new.)

-- Step 3: Drop the old UNIQUE constraint (employee_name, rock_index, bullet_index)
--   so two orgs can have employees with the same name.
ALTER TABLE org_chart_rock_progress
  DROP CONSTRAINT IF EXISTS org_chart_rock_progress_employee_name_rock_index_bullet_index_key;

-- Step 4: Add new org-scoped UNIQUE constraint
ALTER TABLE org_chart_rock_progress
  ADD CONSTRAINT org_chart_rock_progress_org_employee_rock_bullet_key
  UNIQUE (organization_id, employee_name, rock_index, bullet_index);

-- Step 5: Index for fast lookup by org
CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_org_id
  ON org_chart_rock_progress(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_chart_rock_progress_org_employee
  ON org_chart_rock_progress(organization_id, employee_name);
