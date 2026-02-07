/**
 * Auth Session API Tests
 *
 * Tests the GET /api/auth/session endpoint for session validation
 */

import { NextRequest } from "next/server"

// Mock db
const mockFindByToken = jest.fn()
const mockFindById = jest.fn()
const mockFindByOrgAndUser = jest.fn()
const mockSessionUpdate = jest.fn()
const mockOrgFindById = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    sessions: {
      findByToken: mockFindByToken,
      update: mockSessionUpdate,
    },
    users: {
      findById: mockFindById,
    },
    organizations: {
      findById: mockOrgFindById,
    },
    members: {
      findByOrgAndUser: mockFindByOrgAndUser,
    },
  },
}))

jest.mock("@/lib/auth/password", () => ({
  isTokenExpired: jest.fn((expiresAt: string) => new Date(expiresAt) < new Date()),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
  logAuthEvent: jest.fn(),
}))

import { getAuthContext } from "@/lib/auth/middleware"

describe("Auth Session Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createRequestWithCookie(token?: string): NextRequest {
    const req = new NextRequest("http://localhost:3000/api/auth/session")
    if (token) {
      // NextRequest cookies are read-only, so we create with proper headers
      return new NextRequest("http://localhost:3000/api/auth/session", {
        headers: { cookie: `session_token=${token}` },
      })
    }
    return req
  }

  it("should return null when no session cookie is present", async () => {
    const req = createRequestWithCookie()
    const result = await getAuthContext(req)
    expect(result).toBeNull()
  })

  it("should return null when session is expired", async () => {
    const expiredDate = new Date(Date.now() - 86400000).toISOString() // 1 day ago
    mockFindByToken.mockResolvedValueOnce({
      id: "session-1",
      userId: "user-1",
      organizationId: "org-1",
      token: "valid-token",
      expiresAt: expiredDate,
    })

    const req = createRequestWithCookie("valid-token")
    const result = await getAuthContext(req)
    expect(result).toBeNull()
  })

  it("should return auth context for valid session", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    mockFindByToken.mockResolvedValueOnce({
      id: "session-1",
      userId: "user-1",
      organizationId: "org-1",
      token: "valid-token",
      expiresAt: futureDate,
    })
    mockFindById.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      name: "Test User",
    })
    mockOrgFindById.mockResolvedValueOnce({
      id: "org-1",
      name: "Test Org",
    })
    mockFindByOrgAndUser.mockResolvedValueOnce({
      id: "member-1",
      role: "member",
      organizationId: "org-1",
      userId: "user-1",
    })
    mockSessionUpdate.mockResolvedValueOnce(undefined)

    const req = createRequestWithCookie("valid-token")
    const result = await getAuthContext(req)

    expect(result).not.toBeNull()
    expect(result?.user.id).toBe("user-1")
    expect(result?.organization.id).toBe("org-1")
    expect(result?.sessionId).toBe("session-1")
  })

  it("should return null when user not found", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    mockFindByToken.mockResolvedValueOnce({
      id: "session-1",
      userId: "deleted-user",
      organizationId: "org-1",
      expiresAt: futureDate,
    })
    mockFindById.mockResolvedValueOnce(null)

    const req = createRequestWithCookie("valid-token")
    const result = await getAuthContext(req)
    expect(result).toBeNull()
  })

  it("should return null when organization not found", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    mockFindByToken.mockResolvedValueOnce({
      id: "session-1",
      userId: "user-1",
      organizationId: "deleted-org",
      expiresAt: futureDate,
    })
    mockFindById.mockResolvedValueOnce({ id: "user-1" })
    mockOrgFindById.mockResolvedValueOnce(null)

    const req = createRequestWithCookie("valid-token")
    const result = await getAuthContext(req)
    expect(result).toBeNull()
  })

  it("should return null when member record not found", async () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString()
    mockFindByToken.mockResolvedValueOnce({
      id: "session-1",
      userId: "user-1",
      organizationId: "org-1",
      expiresAt: futureDate,
    })
    mockFindById.mockResolvedValueOnce({ id: "user-1" })
    mockOrgFindById.mockResolvedValueOnce({ id: "org-1" })
    mockFindByOrgAndUser.mockResolvedValueOnce(null)

    const req = createRequestWithCookie("valid-token")
    const result = await getAuthContext(req)
    expect(result).toBeNull()
  })
})
