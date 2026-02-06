# OAuth Token Encryption Implementation Checklist

## Implementation Complete ✅

This document provides a checklist for verifying and deploying the OAuth token encryption implementation.

## What Was Implemented

### 1. Core Encryption Utility ✅
- **File**: `/lib/crypto/token-encryption.ts`
- **Features**:
  - AES-256-GCM encryption/decryption functions
  - Token format validation
  - Encryption key validation
  - Comprehensive error handling
  - Debug logging (no sensitive data exposure)

### 2. Asana Token Encryption ✅
**Files Modified**:
- `/app/api/asana/oauth/callback/route.ts` - OAuth callback (encrypt on store)
- `/app/api/asana/me/sync/route.ts` - Task sync (decrypt on use)
- `/app/api/asana/me/connect/route.ts` - Personal token connection (encrypt on store)

**Protected Fields**:
- `organization_members.asana_pat`
- `organization_members.asana_refresh_token`
- `asana_connections.personal_access_token`

### 3. Google Calendar Token Encryption ✅
**Files Modified**:
- `/app/api/google-calendar/callback/route.ts` - OAuth callback (encrypt on store)
- `/lib/google-calendar.ts` - Calendar integration (decrypt on use, encrypt on refresh)

**Protected Fields**:
- `google_calendar_tokens.access_token`
- `google_calendar_tokens.refresh_token`

### 4. Migration Scripts ✅
**Files Created**:
- `/migrations/1738800000000_token_encryption_prep.sql` - SQL preparation
- `/migrations/1738800000000_encrypt_oauth_tokens.ts` - TypeScript migration
- `/scripts/encrypt-tokens.js` - Standalone Node.js migration
- Added `npm run migrate:encrypt-tokens` to package.json

### 5. Documentation ✅
**Files Created**:
- `/docs/OAUTH_TOKEN_ENCRYPTION.md` - Complete implementation guide
- Updated `.env.example` - Added TOKEN_ENCRYPTION_KEY documentation

## Deployment Checklist

### Pre-Deployment

- [ ] **Generate Encryption Key**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

- [ ] **Store Key Securely**
  - [ ] Add to environment variables (Vercel, AWS, etc.)
  - [ ] Document key location in team password manager
  - [ ] Create backup of key in secure location
  - [ ] Set up key rotation schedule (recommended: quarterly)

- [ ] **Review Code Changes**
  - [ ] All OAuth callback routes encrypt tokens
  - [ ] All token usage routes decrypt tokens
  - [ ] Token refresh flows re-encrypt new tokens
  - [ ] Error handling is comprehensive
  - [ ] No console.log of plaintext tokens

### Deployment to Staging

- [ ] **Set Environment Variable**
  ```bash
  # In Vercel, AWS, or your platform
  TOKEN_ENCRYPTION_KEY=your_generated_key_here
  ```

- [ ] **Deploy Application**
  ```bash
  git push origin main  # Or your deployment process
  ```

- [ ] **Run SQL Migration**
  - Access your database
  - Run: `/migrations/1738800000000_token_encryption_prep.sql`
  - Verify: `SELECT * FROM token_encryption_status;`

- [ ] **Run Token Encryption Migration**
  ```bash
  npm run migrate:encrypt-tokens
  ```

- [ ] **Verify Migration Success**
  ```sql
  -- Check all tokens are encrypted
  SELECT table_name,
         COUNT(*) as total,
         COUNT(CASE WHEN asana_pat_status = 'encrypted' OR
                         token_status = 'encrypted' OR
                         access_token_status = 'encrypted'
                    THEN 1 END) as encrypted
  FROM token_encryption_status
  GROUP BY table_name;

  -- Should show no 'plaintext' entries
  SELECT * FROM token_encryption_status
  WHERE asana_pat_status = 'plaintext'
     OR token_status = 'plaintext'
     OR access_token_status = 'plaintext';
  ```

### Testing in Staging

- [ ] **Test Asana OAuth Flow**
  - [ ] Connect new Asana account
  - [ ] Verify token is encrypted in database
  - [ ] Sync tasks from Asana
  - [ ] Verify sync works correctly
  - [ ] Check error logs for decryption issues

- [ ] **Test Google Calendar OAuth Flow**
  - [ ] Connect new Google Calendar
  - [ ] Verify tokens are encrypted in database
  - [ ] Create calendar event from AIMS
  - [ ] Verify calendar sync works
  - [ ] Test token refresh (wait for expiration or force expire)

- [ ] **Test Existing Connections**
  - [ ] Existing Asana connections still work
  - [ ] Existing Google Calendar connections still work
  - [ ] Token refresh works for existing connections

- [ ] **Monitor Logs**
  - [ ] No "Invalid encrypted token format" errors
  - [ ] No "Failed to decrypt token" errors
  - [ ] Encryption/decryption debug logs present

### Deployment to Production

- [ ] **Generate NEW Production Key**
  ```bash
  # DO NOT reuse staging key
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

- [ ] **Set Production Environment Variable**
  - [ ] Add TOKEN_ENCRYPTION_KEY to production environment
  - [ ] Verify it's set correctly
  - [ ] Document in secure location

- [ ] **Schedule Maintenance Window**
  - [ ] Notify users of brief maintenance
  - [ ] Plan for ~15-30 minutes depending on token count

- [ ] **Deploy to Production**
  ```bash
  git push origin main
  ```

- [ ] **Run Migrations** (during maintenance window)
  ```bash
  # 1. Run SQL migration
  npm run migrate

  # 2. Run token encryption migration
  npm run migrate:encrypt-tokens
  ```

- [ ] **Verify Production Migration**
  ```sql
  SELECT * FROM token_encryption_status;
  ```

- [ ] **Smoke Test Production**
  - [ ] Test Asana OAuth flow
  - [ ] Test Google Calendar OAuth flow
  - [ ] Verify existing integrations work
  - [ ] Check error monitoring dashboard

- [ ] **Monitor First 24 Hours**
  - [ ] Watch error rates
  - [ ] Check for decryption failures
  - [ ] Monitor API success rates
  - [ ] Review user reports

### Post-Deployment

- [ ] **Update Documentation**
  - [ ] Mark feature as deployed in changelog
  - [ ] Update internal wiki/docs
  - [ ] Document any issues encountered

- [ ] **Set Up Monitoring**
  - [ ] Alert on any plaintext tokens
  - [ ] Alert on decryption failures
  - [ ] Dashboard for encryption health

- [ ] **Security Audit**
  - [ ] Verify no plaintext tokens in backups
  - [ ] Review access logs for encryption key
  - [ ] Document compliance achievement

- [ ] **Plan Key Rotation**
  - [ ] Schedule first rotation (3-6 months)
  - [ ] Document rotation procedure
  - [ ] Test rotation in staging

## Rollback Plan

If issues occur in production:

### Immediate Rollback (if needed)

**DO NOT** rollback the application code without careful consideration:
- Tokens are now encrypted in database
- Rolling back code will break all integrations
- Users will need to reconnect all OAuth integrations

### If Decryption Fails

1. **Check encryption key is set correctly**:
   ```bash
   # In your deployment platform
   echo $TOKEN_ENCRYPTION_KEY | wc -c  # Should be 45 (32 bytes base64 = 44 chars + newline)
   ```

2. **Verify key matches migration key**:
   - Check if same key was used for migration
   - If not, you must use the original migration key

3. **If key is lost**:
   - Tokens are unrecoverable
   - Users must re-authenticate all OAuth integrations
   - Send communication to users explaining the issue

### If Migration Fails

1. **Check logs** from `npm run migrate:encrypt-tokens`
2. **Identify failed tokens** from error messages
3. **Fix issues and re-run** (migration is idempotent)
4. **Manual fix if needed**:
   ```sql
   -- Check specific token
   SELECT * FROM token_encryption_status WHERE table_name = '...'
   ```

## Verification Queries

### Check Encryption Status
```sql
-- Overview
SELECT * FROM token_encryption_status;

-- Count by status
SELECT
  table_name,
  COALESCE(asana_pat_status, token_status, access_token_status) as status,
  COUNT(*) as count
FROM token_encryption_status
GROUP BY table_name, status
ORDER BY table_name, status;
```

### Find Plaintext Tokens
```sql
-- Should return 0 rows after migration
SELECT * FROM token_encryption_status
WHERE asana_pat_status = 'plaintext'
   OR asana_refresh_status = 'plaintext'
   OR token_status = 'plaintext'
   OR access_token_status = 'plaintext'
   OR refresh_token_status = 'plaintext';
```

### Check Token Format
```sql
-- Encrypted tokens should have format: base64:base64:base64
SELECT
  'organization_members' as table_name,
  user_id,
  LENGTH(asana_pat) as token_length,
  (LENGTH(asana_pat) - LENGTH(REPLACE(asana_pat, ':', ''))) as colon_count
FROM organization_members
WHERE asana_pat IS NOT NULL
LIMIT 5;

-- colon_count should be 2 for encrypted tokens
```

## Support and Troubleshooting

### Common Issues

**Issue**: "TOKEN_ENCRYPTION_KEY environment variable is not set"
- **Fix**: Set the environment variable in your deployment platform

**Issue**: "Invalid encrypted token format"
- **Fix**: Run the migration script to encrypt plaintext tokens

**Issue**: "Failed to decrypt token"
- **Fix**: Verify TOKEN_ENCRYPTION_KEY matches the key used for encryption

**Issue**: Users can't sync Asana/Calendar
- **Check**: Error logs for decryption errors
- **Fix**: Verify encryption key, or have users re-authenticate

### Getting Help

1. Check `/docs/OAUTH_TOKEN_ENCRYPTION.md` for detailed documentation
2. Review error logs (never share actual token values)
3. Query `token_encryption_status` view for issues
4. Contact security team if tokens were compromised

## Compliance Notes

This implementation helps achieve:
- ✅ **GDPR Article 32**: Security of processing (encryption at rest)
- ✅ **SOC 2**: Logical and physical access controls
- ✅ **HIPAA**: Technical safeguards (if applicable)
- ✅ **PCI DSS**: Protection of stored cardholder data (if applicable)

Document this in your compliance reports.

## Success Criteria

- ✅ All OAuth tokens encrypted in database
- ✅ Zero plaintext tokens remaining
- ✅ All integrations functioning correctly
- ✅ No increase in error rates
- ✅ Encryption key stored securely
- ✅ Monitoring and alerts configured
- ✅ Documentation complete
- ✅ Team trained on procedures

## Next Steps After Deployment

1. **Monitor for 1 week**: Watch for any issues
2. **Review metrics**: Check integration success rates
3. **Plan key rotation**: Schedule first rotation
4. **Audit compliance**: Update compliance documentation
5. **Encrypt additional fields**: Consider other sensitive data
6. **Implement HSM**: For enterprise customers, consider HSM integration

---

**Implementation Date**: 2026-02-05
**Implemented By**: Adam Wolfe & Claude Sonnet 4.5
**Git Commits**: 169f892, feedae7, d9c8a83, dbaa6ee
