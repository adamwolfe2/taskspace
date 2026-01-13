/**
 * Password hashing and validation tests
 *
 * Tests for:
 * - bcrypt password hashing
 * - Password verification
 * - Password strength validation
 */

import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  validatePassword,
} from "@/lib/auth/password"

describe("Password Hashing", () => {
  describe("hashPassword", () => {
    it("should return a bcrypt hash starting with $2b$", async () => {
      const hash = await hashPassword("TestPassword123")
      expect(hash).toMatch(/^\$2[aby]\$12\$/)
    })

    it("should generate different hashes for the same password", async () => {
      const hash1 = await hashPassword("TestPassword123")
      const hash2 = await hashPassword("TestPassword123")
      expect(hash1).not.toBe(hash2)
    })

    it("should generate hashes with 12 rounds", async () => {
      const hash = await hashPassword("TestPassword123")
      // bcrypt format: $2b$<rounds>$<salt+hash>
      expect(hash).toContain("$12$")
    })
  })

  describe("verifyPassword", () => {
    it("should return true for matching password", async () => {
      const password = "TestPassword123"
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)
      expect(result).toBe(true)
    })

    it("should return false for non-matching password", async () => {
      const hash = await hashPassword("TestPassword123")
      const result = await verifyPassword("WrongPassword123", hash)
      expect(result).toBe(false)
    })

    it("should return false for empty stored hash", async () => {
      const result = await verifyPassword("TestPassword123", "")
      expect(result).toBe(false)
    })

    it("should return false for invalid hash format", async () => {
      const result = await verifyPassword("TestPassword123", "invalid-hash")
      expect(result).toBe(false)
    })

    it("should return false for legacy SHA256 hash format (no longer supported)", async () => {
      // Legacy format was salt:hash - this should now return false
      const result = await verifyPassword("TestPassword123", "salt123:abcdef1234567890")
      expect(result).toBe(false)
    })

    it("should handle special characters in password", async () => {
      const password = "Test@P4$$w0rd!#%"
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)
      expect(result).toBe(true)
    })

    it("should handle unicode characters in password", async () => {
      const password = "Tëst😀Pässwörd123"
      const hash = await hashPassword(password)
      const result = await verifyPassword(password, hash)
      expect(result).toBe(true)
    })
  })
})

describe("Password Validation", () => {
  describe("validatePasswordStrength", () => {
    it("should pass for a valid password", () => {
      const result = validatePasswordStrength("ValidPass123")
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should fail for password shorter than 8 characters", () => {
      const result = validatePasswordStrength("Pass1")
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Password must be at least 8 characters long")
    })

    it("should fail for password without uppercase letter", () => {
      const result = validatePasswordStrength("password123")
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Password must contain at least one uppercase letter")
    })

    it("should fail for password without lowercase letter", () => {
      const result = validatePasswordStrength("PASSWORD123")
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Password must contain at least one lowercase letter")
    })

    it("should fail for password without number", () => {
      const result = validatePasswordStrength("PasswordABC")
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Password must contain at least one number")
    })

    it("should collect all errors for completely invalid password", () => {
      const result = validatePasswordStrength("abc")
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(3)
      expect(result.errors).toContain("Password must be at least 8 characters long")
      expect(result.errors).toContain("Password must contain at least one uppercase letter")
      expect(result.errors).toContain("Password must contain at least one number")
    })

    it("should handle empty password", () => {
      const result = validatePasswordStrength("")
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Password must be at least 8 characters long")
    })

    it("should include backwards-compatible message field", () => {
      const result = validatePasswordStrength("short")
      expect(result.message).toBe(result.errors[0])
    })

    it("should pass for password with exactly 8 characters", () => {
      const result = validatePasswordStrength("Passwrd1")
      expect(result.valid).toBe(true)
    })

    it("should pass for password with special characters", () => {
      const result = validatePasswordStrength("P@ssw0rd!")
      expect(result.valid).toBe(true)
    })
  })

  describe("validatePassword (legacy)", () => {
    it("should return valid true for valid password", () => {
      const result = validatePassword("ValidPass123")
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it("should return valid false with message for invalid password", () => {
      const result = validatePassword("short")
      expect(result.valid).toBe(false)
      expect(result.message).toBeDefined()
    })
  })
})
