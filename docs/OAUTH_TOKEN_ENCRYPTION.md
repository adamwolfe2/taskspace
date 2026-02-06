# OAuth Token Encryption at Rest

## Overview

This document describes the implementation of OAuth token encryption at rest for the AIMS platform. All OAuth tokens (Asana and Google Calendar) are now encrypted in the database using AES-256-GCM encryption.

## Security Implementation

### Encryption Algorithm

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 16 bytes (randomly generated for each encryption)
- **Authentication Tag**: 16 bytes (ensures integrity)

### Storage Format

Encrypted tokens are stored in the database in the following format:
```
iv:authTag:ciphertext
```

Where:
- `iv` = Initialization Vector (16 bytes, base64 encoded)
- `authTag` = Authentication Tag (16 bytes, base64 encoded)
- `ciphertext` = Encrypted token (variable length, base64 encoded)

Example:
```
x7K9mPq4NzA1YjE2Zjg5ZGE=:Tz8wQzM5RDlCMzA3MjY4Rjc=:vQr7mKp5Nw...
```

## Affected Tables and Columns

### 1. organization_members
- `asana_pat` - Asana Personal Access Token (encrypted)
- `asana_refresh_token` - Asana OAuth refresh token (encrypted)

### 2. asana_connections
- `personal_access_token` - Asana Personal Access Token (encrypted)

### 3. google_calendar_tokens
- `access_token` - Google Calendar access token (encrypted)
- `refresh_token` - Google Calendar refresh token (encrypted)

## Environment Configuration

### TOKEN_ENCRYPTION_KEY

**CRITICAL**: This environment variable must be set in all environments (development, staging, production).

#### Generating the Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This generates a cryptographically secure 32-byte key encoded as base64.

#### Setting the Key

Add to your `.env` file:
```env
TOKEN_ENCRYPTION_KEY=your_generated_key_here
```

**IMPORTANT NOTES**:
- Store this key securely (use a secrets manager in production)
- NEVER commit this key to version control
- If you lose this key, all encrypted tokens become unrecoverable
- Rotating this key requires re-encrypting all tokens

## Migration

### Initial Setup

1. **Generate encryption key**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Set environment variable**:
   ```bash
   export TOKEN_ENCRYPTION_KEY="your_generated_key"
   ```

3. **Run SQL migration** (adds documentation and views):
   ```bash
   npm run migrate
   ```

4. **Encrypt existing tokens**:
   ```bash
   npm run migrate:encrypt-tokens
   ```

### Migration Script

The migration script (`scripts/encrypt-tokens.js`) performs the following:
1. Validates the encryption key is properly configured
2. Scans all tables for plaintext tokens
3. Encrypts each plaintext token using AES-256-GCM
4. Updates the database with encrypted tokens
5. Skips tokens that are already encrypted (idempotent)
6. Reports statistics and any errors

### Verification

After migration, verify all tokens are encrypted:

```sql
-- Check encryption status
SELECT * FROM token_encryption_status;

-- Should show 'encrypted' or 'no_token' for all entries
-- Any 'plaintext' entries indicate tokens that need encryption
```

## Code Implementation

### Encryption Functions

Located in `/lib/crypto/token-encryption.ts`:

```typescript
// Encrypt a token
const encrypted = encryptToken(plaintext)

// Decrypt a token
const plaintext = decryptToken(encrypted)

// Check if a token is encrypted
const isEncrypted = isTokenEncrypted(token)

// Validate encryption key configuration
const { isValid, error } = validateEncryptionKey()
```

### Usage in OAuth Flows

#### Asana OAuth Callback
**File**: `/app/api/asana/oauth/callback/route.ts`

```typescript
import { encryptToken } from "@/lib/crypto/token-encryption"

// Encrypt tokens before storing
const encryptedAccessToken = encryptToken(tokenData.access_token)
const encryptedRefreshToken = encryptToken(tokenData.refresh_token)

await sql`
  UPDATE organization_members
  SET
    asana_pat = ${encryptedAccessToken},
    asana_refresh_token = ${encryptedRefreshToken}
  WHERE ...
`
```

#### Asana Token Usage
**File**: `/app/api/asana/me/sync/route.ts`

```typescript
import { decryptToken } from "@/lib/crypto/token-encryption"

// Decrypt token when reading from database
const member = await getOrgMember(userId, orgId)
const decryptedPat = decryptToken(member.asana_pat)

// Use decrypted token for API calls
const response = await fetch(asanaApi, {
  headers: { Authorization: `Bearer ${decryptedPat}` }
})
```

#### Google Calendar OAuth
**File**: `/app/api/google-calendar/callback/route.ts`

Similar pattern - encrypt before storing, decrypt when using.

### Token Refresh Flow

When refreshing expired tokens:
1. Read encrypted refresh token from database
2. Decrypt the refresh token
3. Use decrypted token to get new access token from OAuth provider
4. Encrypt the new access token
5. Store encrypted access token in database

Example in `/lib/google-calendar.ts`:

```typescript
// Decrypt refresh token
const decryptedRefreshToken = decryptToken(token.refreshToken)

// Get new access token
const refreshed = await refreshAccessToken(decryptedRefreshToken)

// Encrypt new access token before storing
const encryptedAccessToken = encryptToken(refreshed.access_token)

// Update database
await db.googleCalendarTokens.update(userId, orgId, {
  accessToken: encryptedAccessToken,
  expiryDate: refreshed.expiry_date,
})
```

## Security Best Practices

### Key Management

1. **Use a secrets manager** in production (AWS Secrets Manager, Azure Key Vault, etc.)
2. **Rotate keys periodically** (requires re-encrypting all tokens)
3. **Separate keys per environment** (dev, staging, prod use different keys)
4. **Audit key access** (log who/what accesses the encryption key)

### Error Handling

The encryption functions include comprehensive error handling:
- Invalid key format or length
- Decryption authentication failures
- Null/undefined token handling
- Detailed logging (without exposing sensitive data)

### Logging

All encryption/decryption operations are logged at DEBUG level:
```typescript
logger.debug({ length: result.length }, "Token encrypted successfully")
logger.debug("Token decrypted successfully")
```

Errors are logged at ERROR level:
```typescript
logger.error({ error }, "Failed to encrypt token")
logger.error({ error }, "Failed to decrypt token")
```

**IMPORTANT**: Logs never include actual token values.

## Testing

### Validation on Startup

Add this to your application startup:

```typescript
import { validateEncryptionKey } from "@/lib/crypto/token-encryption"

const validation = validateEncryptionKey()
if (!validation.isValid) {
  console.error("Encryption key validation failed:", validation.error)
  process.exit(1)
}
```

### Manual Testing

```typescript
// Test encryption/decryption
const testToken = "test_token_12345"
const encrypted = encryptToken(testToken)
const decrypted = decryptToken(encrypted)

console.assert(decrypted === testToken, "Encryption test failed")
console.assert(isTokenEncrypted(encrypted), "Token should be encrypted")
console.assert(!isTokenEncrypted(testToken), "Token should not be encrypted")
```

## Monitoring

### Check Encryption Status

Query the `token_encryption_status` view:

```sql
SELECT
  table_name,
  COUNT(*) as total_records,
  SUM(CASE WHEN asana_pat_status = 'encrypted' OR token_status = 'encrypted' THEN 1 ELSE 0 END) as encrypted_count,
  SUM(CASE WHEN asana_pat_status = 'plaintext' OR token_status = 'plaintext' THEN 1 ELSE 0 END) as plaintext_count
FROM token_encryption_status
GROUP BY table_name;
```

### Alert on Plaintext Tokens

Set up monitoring to alert if any plaintext tokens are detected:

```sql
SELECT * FROM token_encryption_status
WHERE asana_pat_status = 'plaintext'
   OR asana_refresh_status = 'plaintext'
   OR token_status = 'plaintext'
   OR access_token_status = 'plaintext'
   OR refresh_token_status = 'plaintext';
```

If this query returns any rows, investigate immediately.

## Troubleshooting

### "Invalid encrypted token format" Error

This error occurs when trying to decrypt a plaintext token. Possible causes:
1. Token was stored before encryption was implemented
2. Migration script hasn't been run yet
3. Token was corrupted in database

**Solution**: Run the migration script to encrypt all plaintext tokens.

### "Failed to decrypt token" Error

This error indicates:
1. Wrong encryption key in environment
2. Token was corrupted
3. Token was encrypted with a different key

**Solution**: Verify `TOKEN_ENCRYPTION_KEY` is correct. If key was lost, users must re-authenticate.

### "TOKEN_ENCRYPTION_KEY environment variable is not set"

The application requires this key to function.

**Solution**: Generate and set the key as described above.

## Compliance

This implementation helps achieve compliance with:
- **GDPR**: Data encryption at rest
- **HIPAA**: Security of PHI (if applicable)
- **SOC 2**: Access controls and encryption
- **PCI DSS**: Protection of sensitive authentication data

## Future Enhancements

1. **Key Rotation**: Implement automatic key rotation with dual-key support
2. **Key Per Tenant**: Separate encryption keys per organization
3. **HSM Integration**: Use Hardware Security Modules for key storage
4. **Audit Logging**: Enhanced logging of all decryption operations
5. **Field-Level Encryption**: Encrypt additional sensitive fields

## Support

For questions or issues related to token encryption:
1. Check this documentation
2. Review error logs (without exposing tokens)
3. Verify encryption key configuration
4. Check the `token_encryption_status` view
5. Contact the security team if tokens were compromised
