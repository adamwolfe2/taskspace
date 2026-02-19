#!/usr/bin/env node
 

/**
 * Token Encryption Migration Script
 *
 * This script encrypts all existing plaintext OAuth tokens in the database.
 * It requires TOKEN_ENCRYPTION_KEY to be set in the environment.
 *
 * Usage: node scripts/encrypt-tokens.js
 */

const crypto = require('crypto')
const { sql } = require('../lib/db/sql')

// Encryption configuration
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const _AUTH_TAG_LENGTH = 16
const ENCODING = 'base64'

/**
 * Gets the encryption key from environment
 */
function getEncryptionKey() {
  const key = process.env.TOKEN_ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    )
  }

  const keyBuffer = Buffer.from(key, 'base64')
  if (keyBuffer.length !== 32) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must be 32 bytes (256 bits), got ${keyBuffer.length} bytes`)
  }
  return keyBuffer
}

/**
 * Encrypts a plaintext token using AES-256-GCM
 */
function encryptToken(plaintext) {
  if (!plaintext) return null

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`
}

/**
 * Checks if a token is encrypted
 */
function isTokenEncrypted(token) {
  if (!token) return false
  const parts = token.split(':')
  return parts.length === 3
}

/**
 * Validates encryption key
 */
function validateEncryptionKey() {
  try {
    const key = getEncryptionKey()
    const testToken = 'test_token_' + crypto.randomBytes(16).toString('hex')
    const encrypted = encryptToken(testToken)

    // Test decryption
    const parts = encrypted.split(':')
    const iv = Buffer.from(parts[0], ENCODING)
    const authTag = Buffer.from(parts[1], ENCODING)
    const encryptedData = Buffer.from(parts[2], ENCODING)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]).toString('utf8')

    if (decrypted !== testToken) {
      return { isValid: false, error: 'Encryption test failed' }
    }

    return { isValid: true }
  } catch (error) {
    return { isValid: false, error: error.message }
  }
}

async function migrateAsanaOrgMemberTokens() {
  console.log('\n=== Migrating Asana tokens in organization_members ===')

  const stats = { processed: 0, encrypted: 0, skipped: 0, errors: 0 }

  try {
    const { rows } = await sql`
      SELECT user_id, organization_id, asana_pat, asana_refresh_token
      FROM organization_members
      WHERE asana_pat IS NOT NULL
    `

    console.log(`Found ${rows.length} organization members with Asana PAT`)

    for (const row of rows) {
      stats.processed++

      try {
        const userId = row.user_id
        const orgId = row.organization_id
        const asanaPat = row.asana_pat
        const asanaRefreshToken = row.asana_refresh_token

        const patEncrypted = asanaPat ? isTokenEncrypted(asanaPat) : false
        const refreshEncrypted = asanaRefreshToken ? isTokenEncrypted(asanaRefreshToken) : false

        if (patEncrypted && (!asanaRefreshToken || refreshEncrypted)) {
          console.log(`  Skipping user ${userId} - tokens already encrypted`)
          stats.skipped++
          continue
        }

        const encryptedPat = patEncrypted ? asanaPat : encryptToken(asanaPat)
        const encryptedRefresh = refreshEncrypted ? asanaRefreshToken : encryptToken(asanaRefreshToken)

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
        console.error(`  ERROR processing user: ${error.message}`)
        stats.errors++
      }
    }
  } catch (error) {
    console.error(`FATAL ERROR in migrateAsanaOrgMemberTokens: ${error.message}`)
    throw error
  }

  return stats
}

async function migrateAsanaConnectionTokens() {
  console.log('\n=== Migrating Asana tokens in asana_connections ===')

  const stats = { processed: 0, encrypted: 0, skipped: 0, errors: 0 }

  try {
    const { rows } = await sql`
      SELECT id, user_id, workspace_id, personal_access_token
      FROM asana_connections
      WHERE personal_access_token IS NOT NULL
    `

    console.log(`Found ${rows.length} Asana connections`)

    for (const row of rows) {
      stats.processed++

      try {
        const id = row.id
        const pat = row.personal_access_token

        if (isTokenEncrypted(pat)) {
          console.log(`  Skipping connection ${id} - token already encrypted`)
          stats.skipped++
          continue
        }

        const encryptedPat = encryptToken(pat)

        await sql`
          UPDATE asana_connections
          SET personal_access_token = ${encryptedPat}
          WHERE id = ${id}
        `

        console.log(`  Encrypted token for connection ${id}`)
        stats.encrypted++
      } catch (error) {
        console.error(`  ERROR processing connection: ${error.message}`)
        stats.errors++
      }
    }
  } catch (error) {
    console.error(`FATAL ERROR in migrateAsanaConnectionTokens: ${error.message}`)
    throw error
  }

  return stats
}

async function migrateGoogleCalendarTokens() {
  console.log('\n=== Migrating Google Calendar tokens ===')

  const stats = { processed: 0, encrypted: 0, skipped: 0, errors: 0 }

  try {
    const { rows } = await sql`
      SELECT id, user_id, organization_id, workspace_id, access_token, refresh_token
      FROM google_calendar_tokens
    `

    console.log(`Found ${rows.length} Google Calendar token records`)

    for (const row of rows) {
      stats.processed++

      try {
        const id = row.id
        const accessToken = row.access_token
        const refreshToken = row.refresh_token

        const accessEncrypted = isTokenEncrypted(accessToken)
        const refreshEncrypted = isTokenEncrypted(refreshToken)

        if (accessEncrypted && refreshEncrypted) {
          console.log(`  Skipping token ${id} - tokens already encrypted`)
          stats.skipped++
          continue
        }

        const encryptedAccess = accessEncrypted ? accessToken : encryptToken(accessToken)
        const encryptedRefresh = refreshEncrypted ? refreshToken : encryptToken(refreshToken)

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
        console.error(`  ERROR processing token: ${error.message}`)
        stats.errors++
      }
    }
  } catch (error) {
    console.error(`FATAL ERROR in migrateGoogleCalendarTokens: ${error.message}`)
    throw error
  }

  return stats
}

async function main() {
  console.log('=================================================')
  console.log('OAuth Token Encryption Migration')
  console.log('=================================================')

  console.log('\n1. Validating encryption key...')
  const validation = validateEncryptionKey()
  if (!validation.isValid) {
    console.error(`\nERROR: ${validation.error}`)
    console.error('\nMigration aborted. Please set TOKEN_ENCRYPTION_KEY environment variable.')
    console.error('Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"')
    process.exit(1)
  }
  console.log('✓ Encryption key is valid')

  try {
    const orgMemberStats = await migrateAsanaOrgMemberTokens()
    const connectionStats = await migrateAsanaConnectionTokens()
    const gcalStats = await migrateGoogleCalendarTokens()

    console.log('\n=================================================')
    console.log('Migration Summary')
    console.log('=================================================')

    console.log('\nAsana (organization_members):')
    console.log(`  Processed: ${orgMemberStats.processed}`)
    console.log(`  Encrypted: ${orgMemberStats.encrypted}`)
    console.log(`  Skipped:   ${orgMemberStats.skipped}`)
    console.log(`  Errors:    ${orgMemberStats.errors}`)

    console.log('\nAsana (asana_connections):')
    console.log(`  Processed: ${connectionStats.processed}`)
    console.log(`  Encrypted: ${connectionStats.encrypted}`)
    console.log(`  Skipped:   ${connectionStats.skipped}`)
    console.log(`  Errors:    ${connectionStats.errors}`)

    console.log('\nGoogle Calendar:')
    console.log(`  Processed: ${gcalStats.processed}`)
    console.log(`  Encrypted: ${gcalStats.encrypted}`)
    console.log(`  Skipped:   ${gcalStats.skipped}`)
    console.log(`  Errors:    ${gcalStats.errors}`)

    const totalErrors = orgMemberStats.errors + connectionStats.errors + gcalStats.errors
    const totalEncrypted = orgMemberStats.encrypted + connectionStats.encrypted + gcalStats.encrypted

    console.log('\n=================================================')
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
    console.error('\n=================================================')
    console.error('FATAL ERROR - Migration failed:')
    console.error(error.message)
    console.error('=================================================')
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error)
    process.exit(1)
  })
}

module.exports = { main }
