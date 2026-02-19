/**
 * Token Encryption Utility
 *
 * Provides AES-256-GCM encryption for sensitive OAuth tokens stored in the database.
 * This ensures tokens are encrypted at rest, protecting them from unauthorized access
 * even if the database is compromised.
 *
 * Environment Requirements:
 * - TOKEN_ENCRYPTION_KEY: 32-byte encryption key encoded as base64
 *
 * Generate a key with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 */

import crypto from "crypto"
import { logger } from "@/lib/logger"

// Algorithm configuration
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 16 bytes for GCM
const AUTH_TAG_LENGTH = 16 // 16 bytes authentication tag
const ENCODING = "base64" as const

/**
 * Gets the encryption key from environment
 * @throws Error if TOKEN_ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY environment variable is not set. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    )
  }

  try {
    const keyBuffer = Buffer.from(key, "base64")
    if (keyBuffer.length !== 32) {
      throw new Error(`TOKEN_ENCRYPTION_KEY must be 32 bytes (256 bits), got ${keyBuffer.length} bytes`)
    }
    return keyBuffer
  } catch (error) {
    throw new Error(
      `Invalid TOKEN_ENCRYPTION_KEY format. Must be a base64-encoded 32-byte string. Error: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

/**
 * Encrypts a plaintext token using AES-256-GCM
 *
 * Format: iv:authTag:ciphertext (all base64 encoded)
 *
 * @param plaintext - The token to encrypt
 * @returns Encrypted token in format "iv:authTag:ciphertext"
 * @throws Error if encryption fails or key is invalid
 */
export function encryptToken(plaintext: string | null | undefined): string | null {
  // Handle null/undefined tokens
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return null
  }

  try {
    const key = getEncryptionKey()

    // Generate random IV for each encryption (important for security)
    const iv = crypto.randomBytes(IV_LENGTH)

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    // Encrypt the plaintext
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ])

    // Get authentication tag (ensures integrity)
    const authTag = cipher.getAuthTag()

    // Return format: iv:authTag:ciphertext (all base64)
    const result = `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted.toString(ENCODING)}`

    logger.debug({ length: result.length }, "Token encrypted successfully")
    return result
  } catch (error) {
    logger.error({ error }, "Failed to encrypt token")
    throw new Error(`Token encryption failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Decrypts an encrypted token using AES-256-GCM
 *
 * @param ciphertext - Encrypted token in format "iv:authTag:ciphertext"
 * @returns Decrypted plaintext token
 * @throws Error if decryption fails, authentication fails, or format is invalid
 */
export function decryptToken(ciphertext: string | null | undefined): string | null {
  // Handle null/undefined tokens
  if (ciphertext === null || ciphertext === undefined || ciphertext === "") {
    return null
  }

  try {
    const key = getEncryptionKey()

    // Parse the encrypted format: iv:authTag:ciphertext
    const parts = ciphertext.split(":")
    if (parts.length !== 3) {
      throw new Error(
        `Invalid encrypted token format. Expected "iv:authTag:ciphertext", got ${parts.length} parts. ` +
        `This might be a plaintext token that needs migration.`
      )
    }

    const [ivStr, authTagStr, encryptedStr] = parts

    // Decode from base64
    const iv = Buffer.from(ivStr, ENCODING)
    const authTag = Buffer.from(authTagStr, ENCODING)
    const encrypted = Buffer.from(encryptedStr, ENCODING)

    // Validate lengths
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`)
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new Error(`Invalid auth tag length: expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`)
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])

    const result = decrypted.toString("utf8")
    logger.debug("Token decrypted successfully")
    return result
  } catch (error) {
    logger.error({ error }, "Failed to decrypt token")
    throw new Error(`Token decryption failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Checks if a token is encrypted (vs plaintext)
 *
 * @param token - Token to check
 * @returns true if token appears to be encrypted, false otherwise
 */
export function isTokenEncrypted(token: string | null | undefined): boolean {
  if (!token) return false

  // Encrypted tokens have format: base64:base64:base64
  const parts = token.split(":")
  if (parts.length !== 3) return false

  // Check if all parts are valid base64
  try {
    for (const part of parts) {
      Buffer.from(part, "base64")
    }
    return true
  } catch {
    return false
  }
}

/**
 * Validates that the encryption key is properly configured
 * Useful for startup checks
 *
 * @returns Object with isValid boolean and optional error message
 */
export function validateEncryptionKey(): { isValid: boolean; error?: string } {
  try {
    getEncryptionKey()

    // Test encryption/decryption with a sample token
    const testToken = "test_token_" + crypto.randomBytes(16).toString("hex")
    const encrypted = encryptToken(testToken)
    const decrypted = decryptToken(encrypted)

    if (decrypted !== testToken) {
      return {
        isValid: false,
        error: "Encryption test failed: decrypted value doesn't match original"
      }
    }

    return { isValid: true }
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
