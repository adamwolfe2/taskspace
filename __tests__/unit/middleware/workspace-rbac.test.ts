/**
 * Workspace RBAC Tests
 *
 * Verifies that viewer-role users are blocked from state-changing requests
 * (POST/PUT/PATCH/DELETE) in workspace-scoped middleware wrappers.
 */

const mockGetAuthContext = jest.fn()
const mockUserHasWorkspaceAccess = jest.fn()
const mockGetUserWorkspaceRole = jest.fn()
const mockCheckOrgRateLimit = jest.fn()
const mockGetRateLimitHeaders = jest.fn()

jest.mock("@/lib/auth/middleware", () => ({
  getAuthContext: mockGetAuthContext,
  getUserAuthContext: jest.fn(),
  isAdmin: jest.fn(),
  isOwner: jest.fn(),
}))

jest.mock("@/lib/db/workspaces", () => ({
  userHasWorkspaceAccess: mockUserHasWorkspaceAccess,
  getUserWorkspaceRole: mockGetUserWorkspaceRole,
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkOrgRateLimit: mockCheckOrgRateLimit,
  getRateLimitHeaders: mockGetRateLimitHeaders,
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
import { withWorkspaceAccess } from "@/lib/api/middleware"

const mockAuth = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
  organization: {
    id: "org-1",
    name: "Test Org",
    slug: "test-org",
    subscription: { plan: "free", status: "active", maxUsers: 5, features: [] },
    settings: {},
  },
  member: { id: "member-1", userId: "user-1", organizationId: "org-1", role: "member" },
  sessionId: "sess-1",
}

function setupMocks() {
  mockGetAuthContext.mockResolvedValue(mockAuth)
  mockUserHasWorkspaceAccess.mockResolvedValue(true)
  mockCheckOrgRateLimit.mockReturnValue({ success: true, remaining: 999, resetAt: Date.now() + 3600000 })
}

function createRequest(method: string, workspaceId: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/test?workspaceId=${workspaceId}`, {
    method,
    headers: {
      cookie: "session_token=valid-token",
      "x-requested-with": "XMLHttpRequest",
    },
  })
}

const dummyHandler = jest.fn().mockImplementation(async () => {
  return NextResponse.json({ success: true })
})

describe("Workspace RBAC", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupMocks()
  })

  describe("withWorkspaceAccess", () => {
    it("should allow GET requests for viewer role", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("viewer")

      const handler = withWorkspaceAccess(dummyHandler)
      const res = await handler(createRequest("GET", "ws-1"))
      expect(res.status).toBe(200)
      expect(dummyHandler).toHaveBeenCalled()
    })

    it("should block POST requests for viewer role", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("viewer")

      const handler = withWorkspaceAccess(dummyHandler)
      const res = await handler(createRequest("POST", "ws-1"))
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain("Viewer")
      expect(dummyHandler).not.toHaveBeenCalled()
    })

    it("should block PATCH requests for viewer role", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("viewer")

      const handler = withWorkspaceAccess(dummyHandler)
      const res = await handler(createRequest("PATCH", "ws-1"))
      expect(res.status).toBe(403)
      expect(dummyHandler).not.toHaveBeenCalled()
    })

    it("should block DELETE requests for viewer role", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("viewer")

      const handler = withWorkspaceAccess(dummyHandler)
      const res = await handler(createRequest("DELETE", "ws-1"))
      expect(res.status).toBe(403)
      expect(dummyHandler).not.toHaveBeenCalled()
    })

    it("should allow POST requests for member role", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("member")

      const handler = withWorkspaceAccess(dummyHandler)
      const res = await handler(createRequest("POST", "ws-1"))
      expect(res.status).toBe(200)
      expect(dummyHandler).toHaveBeenCalled()
    })

    it("should allow POST requests for admin role", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("admin")

      const handler = withWorkspaceAccess(dummyHandler)
      const res = await handler(createRequest("POST", "ws-1"))
      expect(res.status).toBe(200)
      expect(dummyHandler).toHaveBeenCalled()
    })

    it("should allow POST requests for owner role", async () => {
      mockGetUserWorkspaceRole.mockResolvedValue("owner")

      const handler = withWorkspaceAccess(dummyHandler)
      const res = await handler(createRequest("POST", "ws-1"))
      expect(res.status).toBe(200)
      expect(dummyHandler).toHaveBeenCalled()
    })

    it("should not check role for GET requests", async () => {
      const handler = withWorkspaceAccess(dummyHandler)
      await handler(createRequest("GET", "ws-1"))
      expect(mockGetUserWorkspaceRole).not.toHaveBeenCalled()
    })
  })
})
