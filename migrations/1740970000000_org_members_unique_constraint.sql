-- Add UNIQUE constraint on organization_members(organization_id, user_id)
-- Needed for ON CONFLICT upserts and data integrity.
-- Implemented as a partial unique INDEX (WHERE user_id IS NOT NULL) so that multiple
-- draft/placeholder rows with NULL user_id in the same org are still allowed.
-- Verified no duplicate (org, user) pairs exist before adding.
CREATE UNIQUE INDEX unique_org_member
  ON organization_members (organization_id, user_id)
  WHERE user_id IS NOT NULL;
