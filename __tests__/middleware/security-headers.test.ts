/**
 * Security Headers Middleware Tests
 *
 * Tests to verify security headers are correctly applied
 */

import { NextRequest, NextResponse } from "next/server"
import { middleware } from "@/middleware"

// Mock environment
const originalEnv = process.env.NODE_ENV

describe("Security Headers Middleware", () => {
  beforeEach(() => {
    // Reset environment before each test
    process.env.NODE_ENV = "test"
  })

  afterAll(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv
  })

  describe("Security Headers on Frontend Routes", () => {
    it("should add security headers to homepage", () => {
      const request = new NextRequest(new URL("http://localhost:3000/"))
      const response = middleware(request)

      // Content Security Policy
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy()
      expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'self'")

      // X-Frame-Options
      expect(response.headers.get("X-Frame-Options")).toBe("DENY")

      // X-Content-Type-Options
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")

      // Referrer-Policy
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin")

      // X-XSS-Protection
      expect(response.headers.get("X-XSS-Protection")).toBe("0")

      // Permissions-Policy
      expect(response.headers.get("Permissions-Policy")).toContain("camera=()")
      expect(response.headers.get("Permissions-Policy")).toContain("microphone=()")
      expect(response.headers.get("Permissions-Policy")).toContain("geolocation=()")
    })

    it("should add security headers to authenticated routes", () => {
      const request = new NextRequest(new URL("http://localhost:3000/dashboard"))
      const response = middleware(request)

      expect(response.headers.get("Content-Security-Policy")).toBeTruthy()
      expect(response.headers.get("X-Frame-Options")).toBe("DENY")
    })
  })

  describe("Security Headers on API Routes", () => {
    it("should add security headers to API routes", () => {
      const request = new NextRequest(new URL("http://localhost:3000/api/tasks"))
      const response = middleware(request)

      expect(response.headers.get("Content-Security-Policy")).toBeTruthy()
      expect(response.headers.get("X-Frame-Options")).toBe("DENY")
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    })

    it("should add rate limit headers to API routes", () => {
      const request = new NextRequest(new URL("http://localhost:3000/api/tasks"))
      const response = middleware(request)

      expect(response.headers.get("X-RateLimit-Limit")).toBeTruthy()
      expect(response.headers.get("X-RateLimit-Remaining")).toBeTruthy()
      expect(response.headers.get("X-RateLimit-Reset")).toBeTruthy()
    })
  })

  describe("Content Security Policy", () => {
    it("should allow required external domains", () => {
      const request = new NextRequest(new URL("http://localhost:3000/"))
      const response = middleware(request)

      const csp = response.headers.get("Content-Security-Policy") || ""

      // Check allowed domains
      expect(csp).toContain("https://api.anthropic.com")
      expect(csp).toContain("https://app.asana.com")
      expect(csp).toContain("https://va.vercel-scripts.com")
      expect(csp).toContain("https://*.ingest.sentry.io")
    })

    it("should allow unsafe-inline for styles (Tailwind)", () => {
      const request = new NextRequest(new URL("http://localhost:3000/"))
      const response = middleware(request)

      const csp = response.headers.get("Content-Security-Policy") || ""
      expect(csp).toContain("style-src 'self' 'unsafe-inline'")
    })

    it("should prevent frame ancestors", () => {
      const request = new NextRequest(new URL("http://localhost:3000/"))
      const response = middleware(request)

      const csp = response.headers.get("Content-Security-Policy") || ""
      expect(csp).toContain("frame-ancestors 'none'")
    })
  })

  describe("HSTS Header", () => {
    it("should not add HSTS in development/test", () => {
      process.env.NODE_ENV = "test"
      const request = new NextRequest(new URL("http://localhost:3000/"))
      const response = middleware(request)

      expect(response.headers.get("Strict-Transport-Security")).toBeNull()
    })

    it("should add HSTS in production", () => {
      process.env.NODE_ENV = "production"
      const request = new NextRequest(new URL("http://localhost:3000/"))
      const response = middleware(request)

      expect(response.headers.get("Strict-Transport-Security")).toBe(
        "max-age=31536000; includeSubDomains"
      )
    })
  })

  describe("Non-API Routes", () => {
    it("should not add rate limit headers to frontend routes", () => {
      const request = new NextRequest(new URL("http://localhost:3000/dashboard"))
      const response = middleware(request)

      // Should have security headers
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy()

      // Should NOT have rate limit headers
      expect(response.headers.get("X-RateLimit-Limit")).toBeNull()
      expect(response.headers.get("X-RateLimit-Remaining")).toBeNull()
      expect(response.headers.get("X-RateLimit-Reset")).toBeNull()
    })
  })
})
