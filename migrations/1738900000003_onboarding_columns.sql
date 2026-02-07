-- Add onboarding tracking columns to organization_members
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT FALSE;
ALTER TABLE organization_members ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;
