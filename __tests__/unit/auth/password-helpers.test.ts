/**
 * Password helper function tests
 *
 * Tests for utility functions NOT covered by password.test.ts:
 * - validateEmail
 * - generateToken
 * - generateId
 * - generateInviteToken
 * - isTokenExpired
 * - getExpirationDate
 */

import {
  validateEmail,
  generateToken,
  generateId,
  generateInviteToken,
  isTokenExpired,
  getExpirationDate,
  slugify,
} from "@/lib/auth/password"

describe("validateEmail", () => {
  it("should return true for valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true)
  })

  it("should return true for email with subdomain", () => {
    expect(validateEmail("user@sub.example.com")).toBe(true)
  })

  it("should return false for email without @", () => {
    expect(validateEmail("userexample.com")).toBe(false)
  })

  it("should return false for email without domain", () => {
    expect(validateEmail("user@")).toBe(false)
  })

  it("should return false for email with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false)
  })

  it("should return false for empty string", () => {
    expect(validateEmail("")).toBe(false)
  })

  it("should return false for email without TLD", () => {
    expect(validateEmail("user@example")).toBe(false)
  })
})

describe("generateToken", () => {
  it("should return a 64-character hex string", () => {
    const token = generateToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it("should return unique tokens on each call", () => {
    const token1 = generateToken()
    const token2 = generateToken()
    expect(token1).not.toBe(token2)
  })
})

describe("generateId", () => {
  it("should return a 24-character hex string", () => {
    const id = generateId()
    expect(id).toHaveLength(24)
    expect(id).toMatch(/^[0-9a-f]{24}$/)
  })

  it("should return unique ids on each call", () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })
})

describe("generateInviteToken", () => {
  it("should return a base64url string", () => {
    const token = generateInviteToken()
    // base64url uses A-Z, a-z, 0-9, -, _
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it("should return a 32-character string (24 bytes in base64url)", () => {
    const token = generateInviteToken()
    expect(token).toHaveLength(32)
  })
})

describe("isTokenExpired", () => {
  it("should return true for a past date", () => {
    const pastDate = new Date(Date.now() - 1000 * 60 * 60).toISOString()
    expect(isTokenExpired(pastDate)).toBe(true)
  })

  it("should return false for a future date", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    expect(isTokenExpired(futureDate)).toBe(false)
  })

  it("should return true for current time (just barely passed)", () => {
    // Create a date 1ms in the past to ensure it's expired
    const justPast = new Date(Date.now() - 1).toISOString()
    expect(isTokenExpired(justPast)).toBe(true)
  })
})

describe("getExpirationDate", () => {
  it("should return a valid ISO date string", () => {
    const result = getExpirationDate()
    expect(() => new Date(result)).not.toThrow()
    expect(new Date(result).toISOString()).toBe(result)
  })

  it("should default to 7 days (168 hours) from now", () => {
    const before = Date.now()
    const result = getExpirationDate()
    const after = Date.now()
    const resultTime = new Date(result).getTime()
    const sevenDaysMs = 168 * 60 * 60 * 1000
    expect(resultTime).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000)
    expect(resultTime).toBeLessThanOrEqual(after + sevenDaysMs + 1000)
  })

  it("should accept custom hours", () => {
    const before = Date.now()
    const result = getExpirationDate(1)
    const resultTime = new Date(result).getTime()
    const oneHourMs = 60 * 60 * 1000
    expect(resultTime).toBeGreaterThanOrEqual(before + oneHourMs - 1000)
    expect(resultTime).toBeLessThanOrEqual(before + oneHourMs + 1000)
  })
})

describe("slugify", () => {
  it("should convert spaces to hyphens and lowercase", () => {
    expect(slugify("My Organization Name")).toBe("my-organization-name")
  })

  it("should remove special characters", () => {
    expect(slugify("Hello World!@#$")).toBe("hello-world")
  })

  it("should trim leading/trailing hyphens", () => {
    expect(slugify("  -Test-  ")).toBe("test")
  })
})
