-- Migration: Add placeholder_user_id to invitations table
-- Purpose: When migrating a draft member from a placeholder email to a real email,
-- we store the old placeholder user ID so that when the real user accepts the invitation,
-- we can transfer all tasks/rocks from the placeholder user to the real user.

ALTER TABLE invitations ADD COLUMN IF NOT EXISTS placeholder_user_id VARCHAR(255);

-- Index for quick lookup during invitation accept
CREATE INDEX IF NOT EXISTS idx_invitations_placeholder_user_id
  ON invitations(placeholder_user_id) WHERE placeholder_user_id IS NOT NULL;
