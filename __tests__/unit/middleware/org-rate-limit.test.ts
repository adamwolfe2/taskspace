/**
 * Organization Rate Limit Tests
 *
 * Verifies that org-level rate limits are enforced in auth middleware wrappers
 * and return 429 when the org exceeds its plan's request limit.
 */

const mockCheckOrgRateLimit = jest.fn()
const mockGetRateLimitHeaders = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    sessions: { findByToken: jest.fn(), update: jest.fn() },
    users: { findById: jest.fn() },
    organizations: { findById: jest.fn() },
    members: { findByOrgAndUser: jest.fn() },
    apiKeys: { findByKey: jest.fn() },
  },
}))

jest.mock("@/lib/db/workspaces", () => ({
  userHasWorkspaceAccess: jest.fn().mockResolvedValue(true),
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkOrgRateLimit: mockCheckOrgRateLimit,
  getRateLimitHeaders: mockGetRateLimitHeaders,
}))

jest.mock("@/lib/logger", () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  logError: jest.fn(),
}))

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"

const mockUser = { id: "user-1", email: "test@example.com", name: "Test User" }
const mockOrg = {
  id: "org-1", name: "Test Org", slug: "test-org",
  subscription: { plan: "free", status: "active", maxUsers: 5, features: [] },
  settings: {},
}
const mockMember = { id: "member-1", userId: "user-1", organizationId: "org-1", role: "member" }
const mockSession = {
  id: "sess-1", userId: "user-1", organizationId: "org-1",
  token: "valid-token", expiresAt: new Date(Date.now() + 86400000).toISOString(),
  lastActiveAt: new Date().toISOString(),
}

function setupAuthMocks() {
  ;(db.sessions.findByToken as jest.Mock).mockResolvedValue(mockSession)
  ;(db.users.findById as jest.Mock).mockResolvedValue(mockUser)
  ;(db.organizations.findById as jest.Mock).mockResolvedValue(mockOrg)
  ;(db.members.findByOrgAndUser as jest.Mock).mockResolvedValue(mockMember)
}

function createGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method: "GET",
    headers: { cookie: "session_token=valid-token" },
  })
}

describe("Organization Rate Limiting", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupAuthMocks()
  })

  const dummyHandler = jest.fn().mockImplementation(async () => {
    const { NextResponse } = await import("next/server")
    return NextResponse.json({ success: true })
  })

  it("should allow request when org is within rate limit", async () => {
    mockCheckOrgRateLimit.mockReturnValue({
      success: true, remaining: 500, resetAt: Date.now() + 3600000,
    })

    const handler = withAuth(dummyHandler)
    const res = await handler(createGetRequest())
    expect(res.status).toBe(200)
    expect(dummyHandler).toHaveBeenCalled()
    expect(mockCheckOrgRateLimit).toHaveBeenCalledWith("org-1", "free")
  })

  it("should return 429 when org exceeds rate limit", async () => {
    mockCheckOrgRateLimit.mockReturnValue({
      success: false, remaining: 0, resetAt: Date.now() + 3600000, retryAfter: 3600,
    })
    mockGetRateLimitHeaders.mockReturnValue({
      "X-RateLimit-Limit": "1000",
      "X-RateLimit-Remaining": "0",
      "Retry-After": "3600",
    })

    const handler = withAuth(dummyHandler)
    const res = await handler(createGetRequest())
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toContain("rate limit")
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  it("should pass the org plan tier to the rate limiter", async () => {
    // Change org to "team" plan
    ;(db.organizations.findById as jest.Mock).mockResolvedValue({
      ...mockOrg,
      subscription: { ...mockOrg.subscription, plan: "team" },
    })
    mockCheckOrgRateLimit.mockReturnValue({
      success: true, remaining: 9999, resetAt: Date.now() + 3600000,
    })

    const handler = withAuth(dummyHandler)
    await handler(createGetRequest())
    expect(mockCheckOrgRateLimit).toHaveBeenCalledWith("org-1", "team")
  })
})
