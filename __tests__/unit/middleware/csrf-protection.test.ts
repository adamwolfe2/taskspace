/**
 * CSRF Protection Tests
 *
 * Verifies that state-changing API requests require the X-Requested-With header
 * when using cookie-based authentication (not API keys).
 */

// Mock all dependencies before imports
jest.mock("@/lib/db", () => ({
  db: {
    sessions: { findByToken: jest.fn(), update: jest.fn() },
    users: { findById: jest.fn() },
    organizations: { findById: jest.fn() },
    members: { findByOrgAndUser: jest.fn() },
    apiKeys: { findByKey: jest.fn(), updateLastUsed: jest.fn() },
  },
}))

jest.mock("@/lib/db/workspaces", () => ({
  userHasWorkspaceAccess: jest.fn().mockResolvedValue(true),
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkOrgRateLimit: jest.fn().mockReturnValue({ success: true, remaining: 999, resetAt: Date.now() + 3600000 }),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}))

jest.mock("@/lib/logger", () => ({
  logger: { debug: jest.fn(), warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  logError: jest.fn(),
}))

import { NextRequest } from "next/server"
import { db } from "@/lib/db"
import { withAuth, withAdmin } from "@/lib/api/middleware"

// Mock auth data
const mockUser = { id: "user-1", email: "test@example.com", name: "Test User" }
const mockOrg = {
  id: "org-1", name: "Test Org", slug: "test-org",
  subscription: { plan: "free", status: "active", maxUsers: 5, features: [] },
  settings: {},
}
const mockMember = { id: "member-1", userId: "user-1", organizationId: "org-1", role: "admin" }
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

function createRequest(method: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost:3000/api/test", {
    method,
    headers: {
      cookie: "session_token=valid-token",
      ...headers,
    },
  })
}

describe("CSRF Protection", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupAuthMocks()
  })

  const dummyHandler = jest.fn().mockImplementation(async () => {
    const { NextResponse } = await import("next/server")
    return NextResponse.json({ success: true })
  })

  describe("withAuth", () => {
    it("should allow GET requests without X-Requested-With header", async () => {
      const handler = withAuth(dummyHandler)
      const req = createRequest("GET")
      const res = await handler(req)
      expect(res.status).toBe(200)
      expect(dummyHandler).toHaveBeenCalled()
    })

    it("should block POST requests without X-Requested-With header", async () => {
      const handler = withAuth(dummyHandler)
      const req = createRequest("POST")
      const res = await handler(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain("CSRF")
      expect(dummyHandler).not.toHaveBeenCalled()
    })

    it("should allow POST requests with X-Requested-With header", async () => {
      const handler = withAuth(dummyHandler)
      const req = createRequest("POST", { "x-requested-with": "XMLHttpRequest" })
      const res = await handler(req)
      expect(res.status).toBe(200)
      expect(dummyHandler).toHaveBeenCalled()
    })

    it("should block PATCH requests without X-Requested-With header", async () => {
      const handler = withAuth(dummyHandler)
      const req = createRequest("PATCH")
      const res = await handler(req)
      expect(res.status).toBe(403)
    })

    it("should block DELETE requests without X-Requested-With header", async () => {
      const handler = withAuth(dummyHandler)
      const req = createRequest("DELETE")
      const res = await handler(req)
      expect(res.status).toBe(403)
    })

    it("should allow API key requests without X-Requested-With header", async () => {
      // API key auth bypasses CSRF check
      ;(db.apiKeys.findByKey as jest.Mock).mockResolvedValue({
        id: "key-1", organizationId: "org-1", createdBy: "user-1",
      })
      ;(db.apiKeys.updateLastUsed as jest.Mock).mockResolvedValue(undefined)

      const handler = withAuth(dummyHandler)
      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
        headers: { authorization: "Bearer aims_test_key_123" },
      })
      const res = await handler(req)
      expect(res.status).toBe(200)
    })
  })

  describe("withAdmin", () => {
    it("should block POST without CSRF header even for admins", async () => {
      const handler = withAdmin(dummyHandler)
      const req = createRequest("POST")
      const res = await handler(req)
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toContain("CSRF")
    })

    it("should allow POST with CSRF header for admins", async () => {
      const handler = withAdmin(dummyHandler)
      const req = createRequest("POST", { "x-requested-with": "XMLHttpRequest" })
      const res = await handler(req)
      expect(res.status).toBe(200)
    })
  })
})
