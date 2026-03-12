/**
 * Weekly Briefs API Tests
 *
 * Tests GET and POST /api/briefs/weekly
 */

import { NextRequest } from "next/server"

const mockSql = jest.fn()
const mockValidateBody = jest.fn()
const mockCheckCreditsOrRespond = jest.fn()
const mockRecordUsage = jest.fn()
const mockGenerateWeeklyBrief = jest.fn()
const mockGenerateId = jest.fn(() => "test-id")
const mockCheckApiRateLimit = jest.fn()
const mockGetRateLimitHeaders = jest.fn(() => ({}))
const mockCacheGet = jest.fn()
const mockCacheSet = jest.fn()
const mockCacheDelete = jest.fn()

jest.mock("@/lib/db/sql", () => ({
  sql: (...args: unknown[]) => mockSql(...args),
}))

jest.mock("@/lib/cache", () => ({
  aiCache: {
    get: (...args: unknown[]) => mockCacheGet(...args),
    set: (...args: unknown[]) => mockCacheSet(...args),
    delete: (...args: unknown[]) => mockCacheDelete(...args),
  },
}))

jest.mock("@/lib/ai/credits", () => ({
  checkCreditsOrRespond: (...args: unknown[]) => mockCheckCreditsOrRespond(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
}))

jest.mock("@/lib/ai/claude-client", () => ({
  generateWeeklyBrief: (...args: unknown[]) => mockGenerateWeeklyBrief(...args),
}))

jest.mock("@/lib/auth/password", () => ({
  generateId: () => mockGenerateId(),
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkApiRateLimit: (...args: unknown[]) => mockCheckApiRateLimit(...args),
  getRateLimitHeaders: (...args: unknown[]) => mockGetRateLimitHeaders(...args),
  checkOrgRateLimit: jest.fn().mockReturnValue({ success: true, remaining: 999, resetAt: Date.now() + 3600000 }),
  getClientIP: jest.fn().mockReturnValue("127.0.0.1"),
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: (...args: unknown[]) => mockValidateBody(...args),
  ValidationError: class ValidationError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 400) {
      super(message)
      this.name = "ValidationError"
      this.statusCode = statusCode
    }
  },
}))

jest.mock("@/lib/validation/schemas", () => ({
  generateWeeklyBriefSchema: {},
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
}))

import { GET, POST } from "@/app/api/briefs/weekly/route"
import { ValidationError } from "@/lib/validation/middleware"

const mockAuth = {
  user: { id: "user-1", email: "user@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "member" as const,
}

describe("GET /api/briefs/weekly", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
    mockCacheGet.mockReturnValue(undefined)
  })

  it("should return cached brief when available", async () => {
    const cachedBrief = {
      id: "brief-1",
      orgId: "org-1",
      userId: "user-1",
      weekStart: "2026-03-09",
      content: { summary: "Great week", priorities: [], risks: [] },
      createdAt: "2026-03-09T08:00:00.000Z",
    }
    mockCacheGet.mockReturnValue(cachedBrief)

    const req = new NextRequest("http://localhost:3000/api/briefs/weekly")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual(cachedBrief)
    expect(mockSql).not.toHaveBeenCalled()
  })

  it("should return null when no brief exists", async () => {
    mockSql.mockResolvedValue({ rows: [] })

    const req = new NextRequest("http://localhost:3000/api/briefs/weekly")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeNull()
  })

  it("should return brief from database when cache misses", async () => {
    const now = new Date()
    mockSql.mockResolvedValue({
      rows: [
        {
          id: "brief-1",
          org_id: "org-1",
          user_id: "user-1",
          week_start: now,
          content: { summary: "Productive week", priorities: [], risks: [] },
          created_at: now,
        },
      ],
    })

    const req = new NextRequest("http://localhost:3000/api/briefs/weekly")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("brief-1")
    expect(data.data.orgId).toBe("org-1")
    expect(data.data.userId).toBe("user-1")
    expect(mockCacheSet).toHaveBeenCalledWith(
      "weekly-brief:org-1:user-1",
      expect.objectContaining({ id: "brief-1" })
    )
  })
})

describe("POST /api/briefs/weekly", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
    mockCheckApiRateLimit.mockResolvedValue({ success: true })
    mockCheckCreditsOrRespond.mockResolvedValue({ allowed: true })
    mockSql.mockResolvedValue({ rows: [] })
    mockRecordUsage.mockResolvedValue(undefined)
  })

  function createRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/briefs/weekly", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("should return validation error if workspaceId missing", async () => {
    mockValidateBody.mockRejectedValue(
      new ValidationError("workspaceId is required", 400)
    )

    const req = createRequest({})
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("workspaceId is required")
  })

  it("should return 429 if rate limited", async () => {
    mockValidateBody.mockResolvedValue({ workspaceId: "ws-1" })
    mockCheckApiRateLimit.mockResolvedValue({ success: false, remaining: 0 })

    const req = createRequest({ workspaceId: "ws-1" })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Too many requests. Please wait a moment.")
  })

  it("should successfully generate brief and invalidate cache", async () => {
    const briefContent = {
      summary: "Focus on shipping the new dashboard",
      priorities: [{ title: "Dashboard launch", urgency: "high" }],
      risks: [{ title: "API latency", severity: "medium" }],
    }

    mockValidateBody.mockResolvedValue({ workspaceId: "ws-1" })
    mockGenerateWeeklyBrief.mockResolvedValue({
      result: briefContent,
      usage: { model: "claude-3-haiku", inputTokens: 400, outputTokens: 150 },
    })

    const req = createRequest({ workspaceId: "ws-1" })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("brief_test-id")
    expect(data.data.orgId).toBe("org-1")
    expect(data.data.userId).toBe("user-1")
    expect(data.data.content).toEqual(briefContent)
    expect(mockCacheDelete).toHaveBeenCalledWith("weekly-brief:org-1:user-1")
    expect(mockRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        action: "weekly-brief",
      })
    )
  })
})
