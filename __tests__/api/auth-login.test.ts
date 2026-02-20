/**
 * Auth Login API Tests
 *
 * Tests the /api/auth/login endpoint
 */

import { NextRequest } from "next/server"

const mockUsersFindByEmail = jest.fn()
const mockUsersUpdate = jest.fn()
const mockMembersFindByUserId = jest.fn()
const mockMembersFindByEmail = jest.fn()
const mockMembersLinkUserId = jest.fn()
const mockOrgFindById = jest.fn()
const mockSessionsCreate = jest.fn()
const mockSessionsDeleteByToken = jest.fn()
const mockSessionsEnforceLimit = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    users: {
      findByEmail: (...args: unknown[]) => mockUsersFindByEmail(...args),
      update: (...args: unknown[]) => mockUsersUpdate(...args),
    },
    members: {
      findByUserId: (...args: unknown[]) => mockMembersFindByUserId(...args),
      findByEmail: (...args: unknown[]) => mockMembersFindByEmail(...args),
      linkUserId: (...args: unknown[]) => mockMembersLinkUserId(...args),
    },
    organizations: {
      findById: (...args: unknown[]) => mockOrgFindById(...args),
    },
    sessions: {
      create: (...args: unknown[]) => mockSessionsCreate(...args),
      deleteByToken: (...args: unknown[]) => mockSessionsDeleteByToken(...args),
      enforceSessionLimit: (...args: unknown[]) => mockSessionsEnforceLimit(...args),
    },
  },
}))

jest.mock("@/lib/auth/password", () => ({
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateId: jest.fn(() => "gen-id-" + Math.random().toString(36).slice(2, 8)),
  generateToken: jest.fn(() => "gen-token-" + Math.random().toString(36).slice(2, 8)),
  getExpirationDate: jest.fn(() => new Date(Date.now() + 86400000 * 7).toISOString()),
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkLoginRateLimit: jest.fn().mockReturnValue({ success: true }),
  resetLoginRateLimit: jest.fn(),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: jest.fn(async (request: any) => request.json()),
  ValidationError: class ValidationError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 400) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

jest.mock("@/lib/db/sql", () => ({
  sql: jest.fn(() => Promise.resolve({ rows: [] })),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logAuthEvent: jest.fn(),
  formatError: jest.fn((e: unknown) => String(e)),
}))

import { POST } from "@/app/api/auth/login/route"
import { verifyPassword } from "@/lib/auth/password"
import { checkLoginRateLimit, resetLoginRateLimit } from "@/lib/auth/rate-limit"

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  passwordHash: "hashed_password",
  name: "Test User",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  emailVerified: true,
}

const mockOrg = {
  id: "org-1",
  name: "Test Org",
  slug: "test-org",
  ownerId: "user-1",
}

const mockMembership = {
  id: "member-1",
  organizationId: "org-1",
  userId: "user-1",
  role: "owner",
  status: "active",
}

describe("Auth Login API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsersFindByEmail.mockResolvedValue(mockUser)
    ;(verifyPassword as jest.Mock).mockResolvedValue(true)
    ;(checkLoginRateLimit as jest.Mock).mockReturnValue({ success: true })
    const { validateBody } = require("@/lib/validation/middleware")
    validateBody.mockImplementation(async (request: any) => request.json())
    mockMembersFindByUserId.mockResolvedValue([mockMembership])
    mockMembersFindByEmail.mockResolvedValue([])
    mockMembersLinkUserId.mockResolvedValue(undefined)
    mockOrgFindById.mockResolvedValue(mockOrg)
  })

  function createRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  describe("successful login", () => {
    it("should login with valid credentials", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe("test@example.com")
      expect(data.data.user.passwordHash).toBeUndefined()
      expect(data.data.organization).toBeDefined()
      expect(data.data.member).toBeDefined()
      expect(data.data.token).toBeDefined()
      expect(data.message).toBe("Login successful")
    })

    it("should set session cookie", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      const response = await POST(request)

      const setCookie = response.headers.get("set-cookie")
      expect(setCookie).toContain("session_token=")
      expect(setCookie).toContain("HttpOnly")
    })

    it("should reset rate limit on successful login", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      await POST(request)

      expect(resetLoginRateLimit).toHaveBeenCalled()
    })

    it("should use first active membership when no org specified", async () => {
      const memberships = [
        { ...mockMembership, organizationId: "org-inactive", status: "inactive" },
        { ...mockMembership, organizationId: "org-active", status: "active" },
      ]
      mockMembersFindByUserId.mockResolvedValue(memberships)
      mockOrgFindById.mockResolvedValue({ ...mockOrg, id: "org-active" })

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      const response = await POST(request)
      await response.json()

      expect(response.status).toBe(200)
      expect(mockOrgFindById).toHaveBeenCalledWith("org-active")
    })

    it("should use specified organizationId if provided", async () => {
      const memberships = [
        { ...mockMembership, organizationId: "org-1" },
        { ...mockMembership, organizationId: "org-2" },
      ]
      mockMembersFindByUserId.mockResolvedValue(memberships)
      mockOrgFindById.mockResolvedValue({ ...mockOrg, id: "org-2" })

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        organizationId: "org-2",
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockOrgFindById).toHaveBeenCalledWith("org-2")
    })
  })

  describe("user without organization", () => {
    it("should create session for user with no org memberships", async () => {
      mockMembersFindByUserId.mockResolvedValue([])

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user).toBeDefined()
      expect(data.data.token).toBeDefined()
      expect(data.data.organization).toBeUndefined()
      expect(data.message).toContain("no organization")
      expect(mockSessionsCreate).toHaveBeenCalledTimes(1)
    })
  })

  describe("error handling", () => {
    it("should return 401 for non-existent email", async () => {
      mockUsersFindByEmail.mockResolvedValue(null)

      const request = createRequest({
        email: "nonexistent@example.com",
        password: "Password123",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid email or password")
    })

    it("should return 401 for wrong password", async () => {
      ;(verifyPassword as jest.Mock).mockResolvedValue(false)

      const request = createRequest({
        email: "test@example.com",
        password: "WrongPassword123",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid email or password")
    })

    it("should not differentiate between wrong email and wrong password", async () => {
      // Security: prevent email enumeration
      mockUsersFindByEmail.mockResolvedValue(null)
      const request1 = createRequest({ email: "bad@example.com", password: "Pass123" })
      const data1 = await (await POST(request1)).json()

      mockUsersFindByEmail.mockResolvedValue(mockUser)
      ;(verifyPassword as jest.Mock).mockResolvedValue(false)
      const request2 = createRequest({ email: "test@example.com", password: "Wrong123" })
      const data2 = await (await POST(request2)).json()

      // Both should return the same generic error
      expect(data1.error).toBe(data2.error)
    })

    it("should return 429 when rate limited", async () => {
      ;(checkLoginRateLimit as jest.Mock).mockReturnValue({ success: false })

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain("Too many")
    })

    it("should return 403 for wrong organization", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        organizationId: "org-not-member-of",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toContain("not a member")
    })

    it("should return 404 when organization not found in DB", async () => {
      mockOrgFindById.mockResolvedValue(null)

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Organization not found")
    })

    it("should return 500 on unexpected error without exposing details", async () => {
      mockUsersFindByEmail.mockRejectedValue(new Error("Connection pool exhausted"))

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).not.toContain("Connection pool")
    })
  })

  describe("session management", () => {
    it("should enforce session limit", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
      })

      await POST(request)

      expect(mockSessionsEnforceLimit).toHaveBeenCalledWith("user-1", 5)
    })

    it("should rotate session when existing cookie present", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session_token=old-token",
        },
        body: JSON.stringify({
          email: "test@example.com",
          password: "Password123",
        }),
      })

      await POST(request)

      expect(mockSessionsDeleteByToken).toHaveBeenCalledWith("old-token")
    })
  })
})
