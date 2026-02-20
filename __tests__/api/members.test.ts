/**
 * Members API Tests
 *
 * Tests POST /api/members (create draft member)
 */

import { NextRequest } from "next/server"

const mockFindByEmail = jest.fn()
const mockFindByOrgAndUser = jest.fn()
const mockFindByOrgAndEmail = jest.fn()
const mockFindByOrganizationId = jest.fn()
const mockMembersCreate = jest.fn()
const mockValidateBody = jest.fn()
const mockGenerateId = jest.fn(() => "member-test-id")
const mockAudit = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    users: {
      findByEmail: (...args: unknown[]) => mockFindByEmail(...args),
    },
    members: {
      findByOrgAndUser: (...args: unknown[]) => mockFindByOrgAndUser(...args),
      findByOrgAndEmail: (...args: unknown[]) => mockFindByOrgAndEmail(...args),
      findByOrganizationId: (...args: unknown[]) => mockFindByOrganizationId(...args),
      create: (...args: unknown[]) => mockMembersCreate(...args),
    },
  },
}))

jest.mock("@/lib/db/sql", () => ({
  sql: jest.fn().mockResolvedValue({ rows: [] }),
}))

jest.mock("@/lib/auth/middleware", () => ({
  isAdmin: jest.fn().mockReturnValue(true),
}))

jest.mock("@/lib/auth/password", () => ({
  generateId: () => mockGenerateId(),
  isTokenExpired: jest.fn().mockReturnValue(false),
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: (...args: unknown[]) => mockValidateBody(...args),
  validateQuery: jest.fn((req: any, _schema: any) => {
    const url = new URL(req.url)
    return Promise.resolve(Object.fromEntries(url.searchParams.entries()))
  }),
  ValidationError: class ValidationError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 400) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

jest.mock("@/lib/utils/pagination", () => ({
  parsePaginationParams: jest.fn().mockReturnValue({ limit: 50, cursor: null }),
  buildPaginatedResponse: jest.fn().mockReturnValue({ items: [], hasMore: false }),
  decodeCursor: jest.fn(),
}))

jest.mock("@/lib/audit", () => ({
  audit: (...args: unknown[]) => mockAudit(...args),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAdmin = jest.fn((handler: unknown) => handler)
const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
  withAdmin: (handler: unknown) => mockWithAdmin(handler),
}))

import { POST } from "@/app/api/members/route"
import { ValidationError } from "@/lib/validation/middleware"

const mockAdminAuth = {
  user: { id: "admin-1", email: "admin@example.com", name: "Admin User" },
  organization: {
    id: "org-1",
    name: "Test Org",
    subscription: { maxUsers: 10, plan: "team" },
  },
  sessionId: "session-1",
  role: "admin" as const,
}

describe("POST /api/members", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAdmin.mockImplementation((h) => h)
    mockWithAuth.mockImplementation((h) => h)
    // Default: no existing user or draft
    mockFindByEmail.mockResolvedValue(null)
    mockFindByOrgAndEmail.mockResolvedValue(null)
    mockFindByOrganizationId.mockResolvedValue([]) // no existing members
    mockMembersCreate.mockResolvedValue(undefined)
  })

  function createRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("should create a new draft member successfully", async () => {
    mockValidateBody.mockResolvedValue({
      name: "Jane Smith",
      email: "jane@example.com",
      role: "member",
      department: "Engineering",
    })

    const req = createRequest({ name: "Jane Smith", email: "jane@example.com", role: "member" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.name).toBe("Jane Smith")
    expect(data.data.email).toBe("jane@example.com")
    expect(data.data.role).toBe("member")
    expect(data.data.status).toBe("pending")
    expect(mockMembersCreate).toHaveBeenCalledTimes(1)
  })

  it("should normalize email to lowercase", async () => {
    mockValidateBody.mockResolvedValue({
      name: "Bob Jones",
      email: "Bob.Jones@EXAMPLE.COM",
      role: "member",
    })

    const req = createRequest({ name: "Bob Jones", email: "Bob.Jones@EXAMPLE.COM" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.email).toBe("bob.jones@example.com")
  })

  it("should create admin role member when role is admin", async () => {
    mockValidateBody.mockResolvedValue({
      name: "Admin User",
      email: "newadmin@example.com",
      role: "admin",
    })

    const req = createRequest({ name: "Admin User", email: "newadmin@example.com", role: "admin" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.role).toBe("admin")
  })

  it("should return 409 when user is already a member", async () => {
    mockValidateBody.mockResolvedValue({
      name: "Existing User",
      email: "existing@example.com",
      role: "member",
    })
    mockFindByEmail.mockResolvedValue({ id: "user-existing" })
    mockFindByOrgAndUser.mockResolvedValue({ id: "member-existing" }) // already a member

    const req = createRequest({ name: "Existing User", email: "existing@example.com" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toBe("This user is already a member of your organization")
    expect(mockMembersCreate).not.toHaveBeenCalled()
  })

  it("should return 409 when draft member email already exists", async () => {
    mockValidateBody.mockResolvedValue({
      name: "Draft User",
      email: "draft@example.com",
      role: "member",
    })
    mockFindByEmail.mockResolvedValue(null)
    mockFindByOrgAndEmail.mockResolvedValue({ id: "draft-existing", email: "draft@example.com" })

    const req = createRequest({ name: "Draft User", email: "draft@example.com" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(409)
    expect(data.success).toBe(false)
    expect(data.error).toBe("A team member with this email already exists")
  })

  it("should return 403 when subscription seat limit is reached", async () => {
    mockValidateBody.mockResolvedValue({
      name: "New User",
      email: "newuser@example.com",
      role: "member",
    })
    // Fill up to maxUsers (10)
    mockFindByOrganizationId.mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({ id: `m-${i}`, status: "active" }))
    )

    const req = createRequest({ name: "New User", email: "newuser@example.com" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toContain("plan limit of 10 users")
  })

  it("should return 400 on validation error", async () => {
    mockValidateBody.mockRejectedValue(new ValidationError("email is required", 400))

    const req = createRequest({ name: "No Email" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("email is required")
  })

  it("should return 500 on DB error", async () => {
    mockValidateBody.mockResolvedValue({
      name: "Test User",
      email: "test@example.com",
      role: "member",
    })
    mockMembersCreate.mockRejectedValue(new Error("DB error"))

    const req = createRequest({ name: "Test User", email: "test@example.com" })
    const res = await POST(req, mockAdminAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
  })

  it("should call audit after successful creation", async () => {
    mockValidateBody.mockResolvedValue({
      name: "Audited User",
      email: "audited@example.com",
      role: "member",
    })

    const req = createRequest({ name: "Audited User", email: "audited@example.com" })
    await POST(req, mockAdminAuth as any)

    expect(mockAudit).toHaveBeenCalledWith(
      mockAdminAuth,
      req,
      "member.created",
      expect.objectContaining({
        resourceType: "member",
        newValues: expect.objectContaining({ email: "audited@example.com", role: "member" }),
      })
    )
  })
})
