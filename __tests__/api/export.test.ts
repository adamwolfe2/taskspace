/**
 * Export API Tests
 *
 * Tests GET /api/export
 */

import { NextRequest } from "next/server"

const mockRocksFindByOrg = jest.fn()
const mockTasksFindByOrg = jest.fn()
const mockEodFindByOrg = jest.fn()
const mockMembersFindWithUsers = jest.fn()
const mockIsAdmin = jest.fn()
const mockLogIntegrationEvent = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    rocks: { findByOrganizationId: (...args: unknown[]) => mockRocksFindByOrg(...args) },
    assignedTasks: { findByOrganizationId: (...args: unknown[]) => mockTasksFindByOrg(...args) },
    eodReports: { findByOrganizationId: (...args: unknown[]) => mockEodFindByOrg(...args) },
    members: { findWithUsersByOrganizationId: (...args: unknown[]) => mockMembersFindWithUsers(...args) },
  },
}))

jest.mock("@/lib/db/sql", () => ({
  sql: jest.fn().mockResolvedValue({ rows: [] }),
}))

jest.mock("@/lib/auth/middleware", () => ({
  isAdmin: (...args: unknown[]) => mockIsAdmin(...args),
}))

jest.mock("@/lib/audit/logger", () => ({
  logIntegrationEvent: (...args: unknown[]) => mockLogIntegrationEvent(...args),
}))

jest.mock("@/lib/api/rate-limit", () => ({
  aiRateLimit: jest.fn().mockReturnValue({ allowed: true, retryAfter: 0 }),
  RATE_LIMITS: { bulk: { maxRequests: 10, windowMs: 3600000 } },
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: jest.fn((req: any) => req.json()),
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
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
const mockWithAdmin = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
  withAdmin: (handler: unknown) => mockWithAdmin(handler),
}))

jest.mock("@/lib/api/errors", () => ({
  Errors: {
    badRequest: (msg: string) => {
      const { NextResponse } = require("next/server")
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    },
    forbidden: (msg: string) => {
      const { NextResponse } = require("next/server")
      return NextResponse.json({ success: false, error: msg }, { status: 403 })
    },
  },
}))

import { GET } from "@/app/api/export/route"

const mockAuth = {
  user: { id: "user-1", email: "user@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "admin" as const,
}

describe("GET /api/export", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
    mockWithAdmin.mockImplementation((h) => h)
    mockIsAdmin.mockReturnValue(true)
    mockMembersFindWithUsers.mockResolvedValue([])
    // Reset rate limit to allowed on every test
    const { aiRateLimit } = require("@/lib/api/rate-limit")
    ;(aiRateLimit as jest.Mock).mockReturnValue({ allowed: true, retryAfter: 0 })
  })

  it("should export rocks as CSV", async () => {
    mockRocksFindByOrg.mockResolvedValue([
      {
        id: "r-1",
        title: "Launch product",
        description: "Q1 goal",
        userId: "user-1",
        status: "on-track",
        progress: 75,
        quarter: "Q1 2026",
        dueDate: "2026-03-31",
        createdAt: "2026-01-01T00:00:00Z",
        ownerEmail: null,
      },
    ])
    mockMembersFindWithUsers.mockResolvedValue([
      { userId: "user-1", name: "Alice" },
    ])

    const req = new NextRequest("http://localhost:3000/api/export?type=rocks&format=csv")
    const res = await GET(req, mockAuth as any)

    expect(res.status).toBe(200)
    const contentType = res.headers.get("content-type")
    expect(contentType).toContain("text/csv")
    const body = await res.text()
    expect(body).toContain("Launch product")
    expect(body).toContain("Alice")
  })

  it("should export tasks as CSV", async () => {
    mockTasksFindByOrg.mockResolvedValue([
      {
        id: "t-1",
        title: "Fix bug",
        description: "Critical bug fix",
        assigneeId: "user-1",
        assigneeName: "Alice",
        assignedByName: "Bob",
        type: "task",
        priority: "high",
        status: "pending",
        dueDate: null,
        completedAt: null,
        createdAt: "2026-02-01T00:00:00Z",
      },
    ])

    const req = new NextRequest("http://localhost:3000/api/export?type=tasks&format=csv")
    const res = await GET(req, mockAuth as any)

    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("Fix bug")
    expect(body).toContain("Alice")
  })

  it("should return 400 when start date is after end date", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/export?type=rocks&startDate=2026-03-01&endDate=2026-01-01"
    )
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain("Start date must be before")
  })

  it("should return 403 when non-admin tries to export EOD reports", async () => {
    mockIsAdmin.mockReturnValue(false)
    mockEodFindByOrg.mockResolvedValue([])
    mockMembersFindWithUsers.mockResolvedValue([])

    const req = new NextRequest("http://localhost:3000/api/export?type=eod-reports")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Only admins can export EOD reports")
  })

  it("should return 429 when rate limited", async () => {
    const { aiRateLimit } = require("@/lib/api/rate-limit")
    ;(aiRateLimit as jest.Mock).mockReturnValue({ allowed: false, retryAfter: 3600 })

    const req = new NextRequest("http://localhost:3000/api/export?type=rocks")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(429)
    expect(data.success).toBe(false)
  })

  it("should filter tasks by date range when provided", async () => {
    const tasks = [
      { id: "t-1", title: "Old task", createdAt: "2026-01-01T00:00:00Z", assigneeName: "Alice", assignedByName: null, type: "task", priority: "low", status: "pending", dueDate: null, completedAt: null, description: null, assigneeId: "u-1" },
      { id: "t-2", title: "New task", createdAt: "2026-02-15T00:00:00Z", assigneeName: "Bob", assignedByName: null, type: "task", priority: "high", status: "completed", dueDate: null, completedAt: null, description: null, assigneeId: "u-2" },
    ]
    mockTasksFindByOrg.mockResolvedValue(tasks)

    const req = new NextRequest(
      "http://localhost:3000/api/export?type=tasks&startDate=2026-02-01&endDate=2026-02-28"
    )
    const res = await GET(req, mockAuth as any)

    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toContain("New task")
    expect(body).not.toContain("Old task")
  })

  it("should return 500 on DB error", async () => {
    mockRocksFindByOrg.mockRejectedValue(new Error("DB failure"))

    const req = new NextRequest("http://localhost:3000/api/export?type=rocks")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
  })
})
