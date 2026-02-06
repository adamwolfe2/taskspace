/**
 * Migration: Prepare for token encryption
 *
 * This migration adds documentation and creates helper views for token management.
 * The actual token encryption is performed by the TypeScript migration script:
 * migrations/1738800000000_encrypt_oauth_tokens.ts
 *
 * IMPORTANT: After running this SQL migration, you MUST run the TypeScript migration:
 * 1. Set TOKEN_ENCRYPTION_KEY environment variable
 * 2. Run: npm run migrate:encrypt-tokens (or node migrations/1738800000000_encrypt_oauth_tokens.ts)
 */

-- Add comments to tables documenting that tokens are now encrypted
COMMENT ON COLUMN organization_members.asana_pat IS 'Encrypted Asana Personal Access Token (AES-256-GCM)';
COMMENT ON COLUMN organization_members.asana_refresh_token IS 'Encrypted Asana refresh token (AES-256-GCM)';
COMMENT ON COLUMN asana_connections.personal_access_token IS 'Encrypted Asana Personal Access Token (AES-256-GCM)';
COMMENT ON COLUMN google_calendar_tokens.access_token IS 'Encrypted Google Calendar access token (AES-256-GCM)';
COMMENT ON COLUMN google_calendar_tokens.refresh_token IS 'Encrypted Google Calendar refresh token (AES-256-GCM)';

-- Create a view to help identify which tokens need encryption (for debugging)
-- This view checks if tokens have the encrypted format (contains 3 colon-separated parts)
CREATE OR REPLACE VIEW token_encryption_status AS
SELECT
  'organization_members' AS table_name,
  user_id,
  organization_id,
  CASE
    WHEN asana_pat IS NULL THEN 'no_token'
    WHEN asana_pat LIKE '%:%:%' THEN 'encrypted'
    ELSE 'plaintext'
  END AS asana_pat_status,
  CASE
    WHEN asana_refresh_token IS NULL THEN 'no_token'
    WHEN asana_refresh_token LIKE '%:%:%' THEN 'encrypted'
    ELSE 'plaintext'
  END AS asana_refresh_status
FROM organization_members
WHERE asana_pat IS NOT NULL

UNION ALL

SELECT
  'asana_connections' AS table_name,
  user_id,
  organization_id,
  CASE
    WHEN personal_access_token IS NULL THEN 'no_token'
    WHEN personal_access_token LIKE '%:%:%' THEN 'encrypted'
    ELSE 'plaintext'
  END AS token_status,
  NULL AS refresh_status
FROM asana_connections

UNION ALL

SELECT
  'google_calendar_tokens' AS table_name,
  user_id,
  organization_id,
  CASE
    WHEN access_token IS NULL THEN 'no_token'
    WHEN access_token LIKE '%:%:%' THEN 'encrypted'
    ELSE 'plaintext'
  END AS access_token_status,
  CASE
    WHEN refresh_token IS NULL THEN 'no_token'
    WHEN refresh_token LIKE '%:%:%' THEN 'encrypted'
    ELSE 'plaintext'
  END AS refresh_token_status
FROM google_calendar_tokens;

-- Grant access to the view
GRANT SELECT ON token_encryption_status TO PUBLIC;

COMMENT ON VIEW token_encryption_status IS 'Shows encryption status of OAuth tokens. Use this to verify all tokens are encrypted.';
