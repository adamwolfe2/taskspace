/**
 * Migration: Encrypt existing OAuth tokens
 *
 * This migration re-encrypts all existing plaintext OAuth tokens in the database.
 * It processes:
 * 1. Asana tokens in organization_members (asana_pat, asana_refresh_token)
 * 2. Asana tokens in asana_connections (personal_access_token)
 * 3. Google Calendar tokens (access_token, refresh_token)
 *
 * CRITICAL: This migration must be run with TOKEN_ENCRYPTION_KEY set in environment.
 * If the key is not set, the migration will fail.
 *
 * Run with: node -r ts-node/register migrations/1738800000000_encrypt_oauth_tokens.ts
 */

import { sql } from "../lib/db/sql"
import { encryptToken, isTokenEncrypted, validateEncryptionKey } from "../lib/crypto/token-encryption"

async function migrateAsanaOrgMemberTokens(): Promise<{
  processed: number
  encrypted: number
  skipped: number
  errors: number
}> {
  console.log("\n=== Migrating Asana tokens in organization_members ===")

  const stats = { processed: 0, encrypted: 0, skipped: 0, errors: 0 }

  try {
    // Get all org members with Asana tokens
    const { rows } = await sql`
      SELECT user_id, organization_id, asana_pat, asana_refresh_token
      FROM organization_members
      WHERE asana_pat IS NOT NULL
    `

    console.log(`Found ${rows.length} organization members with Asana PAT`)

    for (const row of rows) {
      stats.processed++

      try {
        const userId = row.user_id as string
        const orgId = row.organization_id as string
        const asanaPat = row.asana_pat as string | null
        const asanaRefreshToken = row.asana_refresh_token as string | null

        // Check if tokens are already encrypted
        const patEncrypted = asanaPat ? isTokenEncrypted(asanaPat) : false
        const refreshEncrypted = asanaRefreshToken ? isTokenEncrypted(asanaRefreshToken) : false

        if (patEncrypted && (!asanaRefreshToken || refreshEncrypted)) {
          console.log(`  Skipping user ${userId} - tokens already encrypted`)
          stats.skipped++
          continue
        }

        // Encrypt tokens
        const encryptedPat = patEncrypted ? asanaPat : encryptToken(asanaPat)
        const encryptedRefresh = refreshEncrypted ? asanaRefreshToken : encryptToken(asanaRefreshToken)

        // Update database
        await sql`
          UPDATE organization_members
          SET
            asana_pat = ${encryptedPat},
            asana_refresh_token = ${encryptedRefresh}
          WHERE user_id = ${userId} AND organization_id = ${orgId}
        `

        console.log(`  Encrypted tokens for user ${userId}`)
        stats.encrypted++
      } catch (error) {
        console.error(`  ERROR processing user: ${error instanceof Error ? error.message : String(error)}`)
        stats.errors++
      }
    }
  } catch (error) {
    console.error(`FATAL ERROR in migrateAsanaOrgMemberTokens: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }

  return stats
}

async function migrateAsanaConnectionTokens(): Promise<{
  processed: number
  encrypted: number
  skipped: number
  errors: number
}> {
  console.log("\n=== Migrating Asana tokens in asana_connections ===")

  const stats = { processed: 0, encrypted: 0, skipped: 0, errors: 0 }

  try {
    // Get all Asana connections
    const { rows } = await sql`
      SELECT id, user_id, workspace_id, personal_access_token
      FROM asana_connections
      WHERE personal_access_token IS NOT NULL
    `

    console.log(`Found ${rows.length} Asana connections`)

    for (const row of rows) {
      stats.processed++

      try {
        const id = row.id as string
        const pat = row.personal_access_token as string

        // Check if token is already encrypted
        if (isTokenEncrypted(pat)) {
          console.log(`  Skipping connection ${id} - token already encrypted`)
          stats.skipped++
          continue
        }

        // Encrypt token
        const encryptedPat = encryptToken(pat)

        // Update database
        await sql`
          UPDATE asana_connections
          SET personal_access_token = ${encryptedPat}
          WHERE id = ${id}
        `

        console.log(`  Encrypted token for connection ${id}`)
        stats.encrypted++
      } catch (error) {
        console.error(`  ERROR processing connection: ${error instanceof Error ? error.message : String(error)}`)
        stats.errors++
      }
    }
  } catch (error) {
    console.error(`FATAL ERROR in migrateAsanaConnectionTokens: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }

  return stats
}

async function migrateGoogleCalendarTokens(): Promise<{
  processed: number
  encrypted: number
  skipped: number
  errors: number
}> {
  console.log("\n=== Migrating Google Calendar tokens ===")

  const stats = { processed: 0, encrypted: 0, skipped: 0, errors: 0 }

  try {
    // Get all Google Calendar tokens
    const { rows } = await sql`
      SELECT id, user_id, organization_id, workspace_id, access_token, refresh_token
      FROM google_calendar_tokens
    `

    console.log(`Found ${rows.length} Google Calendar token records`)

    for (const row of rows) {
      stats.processed++

      try {
        const id = row.id as string
        const accessToken = row.access_token as string
        const refreshToken = row.refresh_token as string

        // Check if tokens are already encrypted
        const accessEncrypted = isTokenEncrypted(accessToken)
        const refreshEncrypted = isTokenEncrypted(refreshToken)

        if (accessEncrypted && refreshEncrypted) {
          console.log(`  Skipping token ${id} - tokens already encrypted`)
          stats.skipped++
          continue
        }

        // Encrypt tokens
        const encryptedAccess = accessEncrypted ? accessToken : encryptToken(accessToken)
        const encryptedRefresh = refreshEncrypted ? refreshToken : encryptToken(refreshToken)

        // Update database
        await sql`
          UPDATE google_calendar_tokens
          SET
            access_token = ${encryptedAccess},
            refresh_token = ${encryptedRefresh}
          WHERE id = ${id}
        `

        console.log(`  Encrypted tokens for record ${id}`)
        stats.encrypted++
      } catch (error) {
        console.error(`  ERROR processing token: ${error instanceof Error ? error.message : String(error)}`)
        stats.errors++
      }
    }
  } catch (error) {
    console.error(`FATAL ERROR in migrateGoogleCalendarTokens: ${error instanceof Error ? error.message : String(error)}`)
    throw error
  }

  return stats
}

async function main() {
  console.log("=================================================")
  console.log("OAuth Token Encryption Migration")
  console.log("=================================================")

  // Validate encryption key before starting
  console.log("\n1. Validating encryption key...")
  const validation = validateEncryptionKey()
  if (!validation.isValid) {
    console.error(`\nERROR: ${validation.error}`)
    console.error("\nMigration aborted. Please set TOKEN_ENCRYPTION_KEY environment variable.")
    console.error("Generate a key with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"")
    process.exit(1)
  }
  console.log("✓ Encryption key is valid")

  try {
    // Migrate Asana tokens in organization_members
    const orgMemberStats = await migrateAsanaOrgMemberTokens()

    // Migrate Asana tokens in asana_connections
    const connectionStats = await migrateAsanaConnectionTokens()

    // Migrate Google Calendar tokens
    const gcalStats = await migrateGoogleCalendarTokens()

    // Print summary
    console.log("\n=================================================")
    console.log("Migration Summary")
    console.log("=================================================")

    console.log("\nAsana (organization_members):")
    console.log(`  Processed: ${orgMemberStats.processed}`)
    console.log(`  Encrypted: ${orgMemberStats.encrypted}`)
    console.log(`  Skipped:   ${orgMemberStats.skipped}`)
    console.log(`  Errors:    ${orgMemberStats.errors}`)

    console.log("\nAsana (asana_connections):")
    console.log(`  Processed: ${connectionStats.processed}`)
    console.log(`  Encrypted: ${connectionStats.encrypted}`)
    console.log(`  Skipped:   ${connectionStats.skipped}`)
    console.log(`  Errors:    ${connectionStats.errors}`)

    console.log("\nGoogle Calendar:")
    console.log(`  Processed: ${gcalStats.processed}`)
    console.log(`  Encrypted: ${gcalStats.encrypted}`)
    console.log(`  Skipped:   ${gcalStats.skipped}`)
    console.log(`  Errors:    ${gcalStats.errors}`)

    const totalErrors = orgMemberStats.errors + connectionStats.errors + gcalStats.errors
    const totalEncrypted = orgMemberStats.encrypted + connectionStats.encrypted + gcalStats.encrypted

    console.log("\n=================================================")
    if (totalErrors > 0) {
      console.log(`⚠ Migration completed with ${totalErrors} errors`)
      console.log(`✓ Successfully encrypted ${totalEncrypted} token records`)
      process.exit(1)
    } else {
      console.log(`✓ Migration completed successfully!`)
      console.log(`✓ Encrypted ${totalEncrypted} token records`)
      process.exit(0)
    }
  } catch (error) {
    console.error("\n=================================================")
    console.error("FATAL ERROR - Migration failed:")
    console.error(error instanceof Error ? error.message : String(error))
    console.error("=================================================")
    process.exit(1)
  }
}

// Run migration if executed directly
if (require.main === module) {
  main()
}

export { main as migrateOAuthTokens }
