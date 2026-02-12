/**
 * Rate limit utility tests
 *
 * Tests for:
 * - getClientIP — IP extraction from various headers
 * - getRateLimitHeaders — response header generation
 * - checkLoginRateLimit / checkRegisterRateLimit — sync rate limit behavior
 */

// Unmock rate-limit so we test the actual implementation (jest.setup.js mocks it globally)
jest.unmock("@/lib/auth/rate-limit")

// Mock the sql module before importing rate-limit
jest.mock("@/lib/db/sql", () => ({
  sql: jest.fn(() => Promise.resolve({ rows: [{ attempt_count: "0", count: "0" }] })),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}))

import {
  getClientIP,
  getRateLimitHeaders,
  checkLoginRateLimit,
  checkRegisterRateLimit,
} from "@/lib/auth/rate-limit"

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/test", {
    headers: new Headers(headers),
  })
}

describe("getClientIP", () => {
  it("should extract IP from x-vercel-forwarded-for header", () => {
    const req = createRequest({ "x-vercel-forwarded-for": "1.2.3.4" })
    expect(getClientIP(req)).toBe("1.2.3.4")
  })

  it("should extract first IP from comma-separated x-vercel-forwarded-for", () => {
    const req = createRequest({ "x-vercel-forwarded-for": "1.2.3.4, 5.6.7.8" })
    expect(getClientIP(req)).toBe("1.2.3.4")
  })

  it("should fall back to x-forwarded-for", () => {
    const req = createRequest({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" })
    expect(getClientIP(req)).toBe("10.0.0.1")
  })

  it("should fall back to x-real-ip", () => {
    const req = createRequest({ "x-real-ip": "192.168.1.1" })
    expect(getClientIP(req)).toBe("192.168.1.1")
  })

  it("should fall back to cf-connecting-ip", () => {
    const req = createRequest({ "cf-connecting-ip": "172.16.0.1" })
    expect(getClientIP(req)).toBe("172.16.0.1")
  })

  it("should return 'unknown' when no IP headers present", () => {
    const req = createRequest({})
    expect(getClientIP(req)).toBe("unknown")
  })

  it("should prefer x-vercel-forwarded-for over other headers", () => {
    const req = createRequest({
      "x-vercel-forwarded-for": "1.1.1.1",
      "x-forwarded-for": "2.2.2.2",
      "x-real-ip": "3.3.3.3",
    })
    expect(getClientIP(req)).toBe("1.1.1.1")
  })

  it("should trim whitespace from IP", () => {
    const req = createRequest({ "x-real-ip": "  10.0.0.5  " })
    expect(getClientIP(req)).toBe("10.0.0.5")
  })
})

describe("getRateLimitHeaders", () => {
  it("should return correct headers for successful request", () => {
    const result = {
      success: true,
      remaining: 4,
      resetAt: Date.now() + 60000,
    }
    const headers = getRateLimitHeaders(result, 5)
    expect(headers["X-RateLimit-Limit"]).toBe("5")
    expect(headers["X-RateLimit-Remaining"]).toBe("4")
    expect(headers["X-RateLimit-Reset"]).toBeDefined()
    expect(headers["Retry-After"]).toBeUndefined()
  })

  it("should include Retry-After when retryAfter is present", () => {
    const result = {
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60000,
      retryAfter: 900,
    }
    const headers = getRateLimitHeaders(result)
    expect(headers["Retry-After"]).toBe("900")
    expect(headers["X-RateLimit-Remaining"]).toBe("0")
  })

  it("should use remaining+1 as limit when maxAttempts not provided", () => {
    const result = {
      success: true,
      remaining: 3,
      resetAt: Date.now() + 60000,
    }
    const headers = getRateLimitHeaders(result)
    expect(headers["X-RateLimit-Limit"]).toBe("4")
  })

  it("should format resetAt as ISO date string", () => {
    const resetAt = Date.now() + 60000
    const result = {
      success: true,
      remaining: 2,
      resetAt,
    }
    const headers = getRateLimitHeaders(result)
    expect(headers["X-RateLimit-Reset"]).toBe(new Date(resetAt).toISOString())
  })
})

describe("checkLoginRateLimit", () => {
  it("should return success for first request (no cache)", () => {
    const req = createRequest({ "x-forwarded-for": "99.99.99.1" })
    const result = checkLoginRateLimit(req)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(5) // MAX_ATTEMPTS_LOGIN = 5, no cache = full remaining
  })
})

describe("checkRegisterRateLimit", () => {
  it("should return success for first request (no cache)", () => {
    const req = createRequest({ "x-forwarded-for": "99.99.99.2" })
    const result = checkRegisterRateLimit(req)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(3) // MAX_ATTEMPTS_REGISTER = 3
  })
})
