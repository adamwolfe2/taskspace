import { randomBytes } from "crypto"
import bcrypt from "bcrypt"

const BCRYPT_ROUNDS = 12

// Secure password hashing using bcrypt
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  // Support for legacy SHA256 hashes (format: salt:hash)
  if (storedHash.includes(":")) {
    const { createHash } = await import("crypto")
    const [salt, hash] = storedHash.split(":")
    if (!salt || !hash) return false
    const computedHash = createHash("sha256")
      .update(password + salt)
      .digest("hex")
    return hash === computedHash
  }
  // bcrypt hash format starts with $2b$
  return bcrypt.compare(password, storedHash)
}

export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

export function generateId(): string {
  return randomBytes(12).toString("hex")
}

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url")
}

export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

export function getExpirationDate(hours: number = 24 * 7): string {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" }
  }
  return { valid: true }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
