import { randomBytes } from "crypto"
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12

/**
 * Secure password hashing using bcrypt
 * @param password - Plain text password to hash
 * @returns bcrypt hash string
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a password against a stored bcrypt hash
 * @param password - Plain text password to verify
 * @param storedHash - bcrypt hash to compare against
 * @returns true if password matches
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // bcrypt hashes start with $2a$, $2b$, or $2y$
  if (!storedHash || !storedHash.startsWith("$2")) {
    // Invalid hash format - reject for security
    return false
  }
  return bcrypt.compare(password, storedHash)
}

/**
 * Generate a secure random token for session authentication
 * @returns 64-character hex string (256 bits of entropy)
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Generate a unique identifier for database records
 * @returns 24-character hex string (96 bits of entropy)
 */
export function generateId(): string {
  return randomBytes(12).toString("hex")
}

/**
 * Generate a URL-safe token for invitation links
 * @returns Base64url-encoded string (192 bits of entropy)
 */
export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url")
}

/**
 * Check if a token or session has expired
 * @param expiresAt - ISO date string of expiration time
 * @returns true if the expiration time has passed
 */
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

/**
 * Calculate an expiration date from now
 * @param hours - Number of hours until expiration (default: 168 hours / 7 days)
 * @returns ISO date string of the expiration time
 */
export function getExpirationDate(hours: number = 24 * 7): string {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

/**
 * Validate email format using a basic regex pattern
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
  /** @deprecated Use errors array instead - kept for backwards compatibility */
  message?: string
}

/**
 * Validate password strength against security requirements
 * Rules:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 *
 * @param password - Password to validate
 * @returns Validation result with array of all errors
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = []

  if (!password || password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  return {
    valid: errors.length === 0,
    errors,
    // Backwards compatibility - return first error as message
    message: errors.length > 0 ? errors[0] : undefined,
  }
}

/**
 * @deprecated Use validatePasswordStrength instead
 * Kept for backwards compatibility
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  const result = validatePasswordStrength(password)
  return { valid: result.valid, message: result.message }
}

/**
 * Convert text to a URL-safe slug
 * @param text - Text to convert to slug
 * @returns Lowercase slug with hyphens replacing spaces/underscores
 * @example slugify("My Organization Name") // "my-organization-name"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
