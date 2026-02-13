-- Migration: Add accent_color to organizations table
-- Enables organization-level accent color storage for proper branding cascade

-- Add accent_color column to organizations
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7);

-- Add index for potential branding queries
CREATE INDEX IF NOT EXISTS idx_organizations_branding
  ON organizations(id)
  WHERE primary_color IS NOT NULL OR secondary_color IS NOT NULL OR accent_color IS NOT NULL;

-- Migration complete
