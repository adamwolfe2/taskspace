/**
 * API Key Scope Enforcement Tests
 *
 * Verifies that API key requests are blocked when the key lacks
 * the required scope (read for GET, write for POST/PUT/PATCH/DELETE).
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
import { withAuth } from "@/lib/api/middleware"

function createAuthContext(scopes: string[]) {
  return {
    user: { id: "user-1", email: "test@example.com", name: "Test User" },
    organization: {
      id: "org-1",
      name: "Test Org",
      slug: "test-org",
      subscription: { plan: "free", status: "active", maxUsers: 5, features: [] },
      settings: {},
    },
    member: { id: "member-1", userId: "user-1", organizationId: "org-1", role: "admin" },
    sessionId: "key-1",
    isApiKey: true,
    apiKeyScopes: scopes,
  }
}

function createRequest(method: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    headers: {
      authorization: "Bearer aims_test_key_123",
      "x-requested-with": "XMLHttpRequest",
    },
  })
}

const dummyHandler = jest.fn().mockImplementation(async () => {
  return NextResponse.json({ success: true })
})

describe("API Key Scope Enforcement", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should allow GET with read scope", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext(["read"]))
    const handler = withAuth(dummyHandler)
    const res = await handler(createRequest("GET"))
    expect(res.status).toBe(200)
    expect(dummyHandler).toHaveBeenCalled()
  })

  it("should block POST with read-only scope", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext(["read"]))
    const handler = withAuth(dummyHandler)
    const res = await handler(createRequest("POST"))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain("write")
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  it("should allow POST with write scope", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext(["read", "write"]))
    const handler = withAuth(dummyHandler)
    const res = await handler(createRequest("POST"))
    expect(res.status).toBe(200)
    expect(dummyHandler).toHaveBeenCalled()
  })

  it("should block DELETE with read-only scope", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext(["read"]))
    const handler = withAuth(dummyHandler)
    const res = await handler(createRequest("DELETE"))
    expect(res.status).toBe(403)
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  it("should block PATCH with read-only scope", async () => {
    mockGetAuthContext.mockResolvedValue(createAuthContext(["read"]))
    const handler = withAuth(dummyHandler)
    const res = await handler(createRequest("PATCH"))
    expect(res.status).toBe(403)
    expect(dummyHandler).not.toHaveBeenCalled()
  })

  it("should not enforce scopes for session-based auth", async () => {
    // Session auth (no isApiKey) should bypass scope checks
    mockGetAuthContext.mockResolvedValue({
      ...createAuthContext([]),
      isApiKey: false,
      apiKeyScopes: undefined,
    })
    const handler = withAuth(dummyHandler)
    const res = await handler(createRequest("POST"))
    expect(res.status).toBe(200)
    expect(dummyHandler).toHaveBeenCalled()
  })
})
