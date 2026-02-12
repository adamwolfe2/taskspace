/**
 * withDangerousAdmin Middleware Tests
 *
 * Verifies that dangerous admin operations are properly protected:
 * - Only org owners can access (not admins or members)
 * - API keys are blocked entirely
 * - Production requires ADMIN_OPS_SECRET header
 */

const mockGetAuthContext = jest.fn()

jest.mock("@/lib/auth/middleware", () => ({
  getAuthContext: mockGetAuthContext,
  getUserAuthContext: jest.fn(),
  isAdmin: jest.fn((auth) => auth.member.role === "admin" || auth.member.role === "owner"),
  isOwner: jest.fn((auth) => auth.member.role === "owner"),
}))

jest.mock("@/lib/db/workspaces", () => ({
  userHasWorkspaceAccess: jest.fn().mockResolvedValue(true),
  getUserWorkspaceRole: jest.fn().mockResolvedValue("member"),
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkOrgRateLimit: jest.fn().mockReturnValue({ success: true, remaining: 999, resetAt: Date.now() + 3600000 }),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}))

jest.mock("@/lib/api/errors", () => ({
  handleError: jest.fn().mockImplementation(() => {
    const { NextResponse } = require("next/server")
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 })
  }),
}))

jest.mock("@/lib/logger", () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  logError: jest.fn(),
}))

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"

function createAuthContext(role: string, isApiKey = false) {
  return {
    user: { id: "user-1", email: "test@example.com", name: "Test User" },
    organization: {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      subscription: { plan: "free", status: "active", maxUsers: 5, features: [] },
      settings: {},
    },
    member: { id: "member-1", userId: "user-1", organizationId: "org-1", role },
    sessionId: "session-1",
    isApiKey,
    apiKeyScopes: isApiKey ? ["read", "write"] : undefined,
  }
}

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/test", {
    method: "POST",
    headers: {
      "x-requested-with": "XMLHttpRequest",
      ...headers,
    },
  })
}

const dummyHandler = jest.fn().mockImplementation(async () => {
  return NextResponse.json({ success: true })
})

describe("withDangerousAdmin", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.ADMIN_OPS_SECRET
    process.env.NODE_ENV = "test"
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("should allow owner access in non-production", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext("owner"))
    const handler = withDangerousAdmin(dummyHandler)
    const res = await handler(createRequest())
    expect(res.status).toBe(200)
    expect(dummyHandler).toHaveBeenCalled()
  })

  it("should block admin (non-owner) access", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext("admin"))
    const handler = withDangerousAdmin(dummyHandler)
    const res = await handler(createRequest())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain("Owner")
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  it("should block member access", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext("member"))
    const handler = withDangerousAdmin(dummyHandler)
    const res = await handler(createRequest())
    expect(res.status).toBe(403)
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  it("should block API key access even for owners", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext("owner", true))
    const handler = withDangerousAdmin(dummyHandler)
    const res = await handler(createRequest())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain("API key")
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  it("should block unauthenticated access", async () => {
    mockGetAuthContext.mockResolvedValue(null)
    const handler = withDangerousAdmin(dummyHandler)
    const res = await handler(createRequest())
    expect(res.status).toBe(401)
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  describe("production environment", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production"
    })

    it("should block when ADMIN_OPS_SECRET is not configured", async () => {
      mockGetAuthContext.mockResolvedValue(createAuthContext("owner"))
      const handler = withDangerousAdmin(dummyHandler)
      const res = await handler(createRequest())
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain("ADMIN_OPS_SECRET")
      expect(dummyHandler).not.toHaveBeenCalled()
    })

    it("should block when X-Admin-Secret header is missing", async () => {
      process.env.ADMIN_OPS_SECRET = "super-secret-123"
      mockGetAuthContext.mockResolvedValue(createAuthContext("owner"))
      const handler = withDangerousAdmin(dummyHandler)
      const res = await handler(createRequest())
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain("Invalid or missing admin secret")
      expect(dummyHandler).not.toHaveBeenCalled()
    })

    it("should block when X-Admin-Secret header is wrong", async () => {
      process.env.ADMIN_OPS_SECRET = "super-secret-123"
      mockGetAuthContext.mockResolvedValue(createAuthContext("owner"))
      const handler = withDangerousAdmin(dummyHandler)
      const res = await handler(createRequest({ "x-admin-secret": "wrong-value" }))
      expect(res.status).toBe(403)
      expect(dummyHandler).not.toHaveBeenCalled()
    })

    it("should allow when X-Admin-Secret header matches", async () => {
      process.env.ADMIN_OPS_SECRET = "super-secret-123"
      mockGetAuthContext.mockResolvedValue(createAuthContext("owner"))
      const handler = withDangerousAdmin(dummyHandler)
      const res = await handler(createRequest({ "x-admin-secret": "super-secret-123" }))
      expect(res.status).toBe(200)
      expect(dummyHandler).toHaveBeenCalled()
    })
  })
})
