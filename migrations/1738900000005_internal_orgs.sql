-- Add is_internal flag for platform-owner organizations
-- Internal orgs bypass all billing/trial checks

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Mark the AIMS org as internal (platform owner)
UPDATE organizations SET is_internal = TRUE WHERE slug = 'aims';
