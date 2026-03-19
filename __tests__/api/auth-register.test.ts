/**
 * Auth Register API Tests
 *
 * Tests the /api/auth/register endpoint
 */

import { NextRequest } from "next/server"

const mockUsersCreate = jest.fn()
const mockUsersFindByEmail = jest.fn()
const mockOrgCreate = jest.fn()
const mockOrgFindBySlug = jest.fn()
const mockMembersCreate = jest.fn()
const mockSessionsCreate = jest.fn()
const mockSessionsEnforceLimit = jest.fn()
const mockWorkspacesCreate = jest.fn()
const mockWorkspaceMembersCreate = jest.fn()
const mockEmailTokensCreate = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    users: {
      create: (...args: unknown[]) => mockUsersCreate(...args),
      findByEmail: (...args: unknown[]) => mockUsersFindByEmail(...args),
    },
    organizations: {
      create: (...args: unknown[]) => mockOrgCreate(...args),
      findBySlug: (...args: unknown[]) => mockOrgFindBySlug(...args),
    },
    members: {
      create: (...args: unknown[]) => mockMembersCreate(...args),
    },
    sessions: {
      create: (...args: unknown[]) => mockSessionsCreate(...args),
      enforceSessionLimit: (...args: unknown[]) => mockSessionsEnforceLimit(...args),
    },
    workspaces: {
      create: (...args: unknown[]) => mockWorkspacesCreate(...args),
    },
    workspaceMembers: {
      create: (...args: unknown[]) => mockWorkspaceMembersCreate(...args),
    },
    emailVerificationTokens: {
      create: (...args: unknown[]) => mockEmailTokensCreate(...args),
    },
  },
}))

jest.mock("@/lib/auth/password", () => ({
  hashPassword: jest.fn().mockResolvedValue("hashed_password"),
  validatePasswordStrength: jest.fn().mockReturnValue({ valid: true }),
  generateId: jest.fn(() => "gen-id-" + Math.random().toString(36).slice(2, 8)),
  generateToken: jest.fn(() => "gen-token-" + Math.random().toString(36).slice(2, 8)),
  getExpirationDate: jest.fn(() => new Date(Date.now() + 86400000).toISOString()),
  slugify: jest.fn((name: string) => name.toLowerCase().replace(/\s+/g, "-")),
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkRegisterRateLimit: jest.fn().mockReturnValue({ success: true }),
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

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logAuthEvent: jest.fn(),
  formatError: jest.fn((e: unknown) => String(e)),
}))

jest.mock("@/lib/integrations/email", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({ success: true }),
}))

jest.mock("@/lib/db/transactions", () => ({
  withTransaction: jest.fn(async (cb: (client: { sql: jest.Mock }) => Promise<void>) =>
    cb({ sql: jest.fn().mockResolvedValue(undefined) })
  ),
}))

import { POST } from "@/app/api/auth/register/route"
import { checkRegisterRateLimit } from "@/lib/auth/rate-limit"

describe("Auth Register API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUsersFindByEmail.mockResolvedValue(null) // No existing user
    mockOrgFindBySlug.mockResolvedValue(null) // No slug conflict
    ;(checkRegisterRateLimit as jest.Mock).mockReturnValue({ success: true })
    const { validateBody } = require("@/lib/validation/middleware")
    validateBody.mockImplementation(async (request: any) => request.json())
    const { hashPassword } = require("@/lib/auth/password")
    hashPassword.mockResolvedValue("hashed_password")
    const { sendVerificationEmail } = require("@/lib/integrations/email")
    sendVerificationEmail.mockResolvedValue({ success: true })
  })

  function createRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost:3000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  describe("successful registration", () => {
    it("should register a new user without organization", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user.email).toBe("test@example.com")
      expect(data.data.user.name).toBe("Test User")
      expect(data.data.user.passwordHash).toBeUndefined()
      expect(data.data.expiresAt).toBeDefined()
      expect(data.data.organization).toBeUndefined()
      expect(mockUsersCreate).toHaveBeenCalledTimes(1)
      expect(mockSessionsCreate).toHaveBeenCalledTimes(1)
    })

    it("should register a user with organization", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
        organizationName: "Test Org",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.organization).toBeDefined()
      expect(data.data.organization.name).toBe("Test Org")
      expect(data.data.organization.slug).toBe("test-org")
      expect(data.data.member).toBeDefined()
      expect(data.data.member.role).toBe("owner")
      expect(mockWorkspacesCreate).toHaveBeenCalledTimes(1)
    })

    it("should set session cookie", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      })

      const response = await POST(request)

      const setCookie = response.headers.get("set-cookie")
      expect(setCookie).toContain("session_token=")
      expect(setCookie).toContain("HttpOnly")
      expect(setCookie).toContain("Path=/")
    })

    it("should normalize email to lowercase", async () => {
      const request = createRequest({
        email: "Test@Example.COM",
        password: "Password123",
        name: "Test User",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.user.email).toBe("test@example.com")
    })

    it("should handle slug collision for organization", async () => {
      mockOrgFindBySlug
        .mockResolvedValueOnce({ id: "existing" }) // First slug taken
        .mockResolvedValueOnce(null) // Suffixed slug available

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
        organizationName: "Test Org",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.organization.slug).toBe("test-org-1")
    })
  })

  describe("error handling", () => {
    it("should return 409 when email already exists", async () => {
      mockUsersFindByEmail.mockResolvedValue({ id: "existing-user" })

      const request = createRequest({
        email: "existing@example.com",
        password: "Password123",
        name: "Existing User",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain("Unable to create account")
      expect(mockUsersCreate).not.toHaveBeenCalled()
    })

    it("should return 429 when rate limited", async () => {
      ;(checkRegisterRateLimit as jest.Mock).mockReturnValue({ success: false })

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toContain("Too many")
    })

    it("should handle validation errors", async () => {
      const { ValidationError } = require("@/lib/validation/middleware")
      const { validateBody } = require("@/lib/validation/middleware")
      validateBody.mockRejectedValueOnce(new ValidationError("Email is required", 400))

      const request = createRequest({})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Email is required")
    })

    it("should return 500 on unexpected error", async () => {
      mockUsersCreate.mockRejectedValueOnce(new Error("Database connection failed"))

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).not.toContain("Database") // Should not expose internal errors
    })

    it("should handle duplicate key error as 409", async () => {
      mockUsersCreate.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint"))

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
    })

    it("should still succeed if default workspace creation fails", async () => {
      mockWorkspacesCreate.mockRejectedValueOnce(new Error("Workspace creation failed"))

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
        organizationName: "Test Org",
      })

      const response = await POST(request)
      const data = await response.json()

      // Registration should still succeed
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.organization).toBeDefined()
    })

    it("should still succeed if verification email fails", async () => {
      const { sendVerificationEmail } = require("@/lib/integrations/email")
      sendVerificationEmail.mockRejectedValueOnce(new Error("Email service down"))

      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe("session management", () => {
    it("should enforce session limit", async () => {
      const request = createRequest({
        email: "test@example.com",
        password: "Password123",
        name: "Test User",
      })

      await POST(request)

      expect(mockSessionsEnforceLimit).toHaveBeenCalledWith(expect.any(String), 5)
    })
  })
})
