/**
 * Company Digests API Tests
 *
 * Tests GET and POST /api/company-digests
 */

import { NextRequest } from "next/server"

const mockSql = jest.fn()
const mockValidateBody = jest.fn()
const mockCheckCreditsOrRespond = jest.fn()
const mockRecordUsage = jest.fn()
const mockGenerateCompanyDigest = jest.fn()
const mockGenerateId = jest.fn(() => "test-id")
const mockCheckApiRateLimit = jest.fn()
const mockGetRateLimitHeaders = jest.fn(() => ({}))

jest.mock("@/lib/db/sql", () => ({
  sql: (...args: unknown[]) => mockSql(...args),
}))

jest.mock("@/lib/ai/credits", () => ({
  checkCreditsOrRespond: (...args: unknown[]) => mockCheckCreditsOrRespond(...args),
  recordUsage: (...args: unknown[]) => mockRecordUsage(...args),
}))

jest.mock("@/lib/ai/claude-client", () => ({
  generateCompanyDigest: (...args: unknown[]) => mockGenerateCompanyDigest(...args),
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
  generateCompanyDigestSchema: {},
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
}))

import { GET, POST } from "@/app/api/company-digests/route"
import { ValidationError } from "@/lib/validation/middleware"

const mockAuth = {
  user: { id: "user-1", email: "user@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "member" as const,
}

describe("GET /api/company-digests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  it("should return 400 if workspaceId is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/company-digests")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("workspaceId is required")
  })

  it("should return empty array when no digests exist", async () => {
    mockSql.mockResolvedValue({ rows: [] })

    const req = new NextRequest("http://localhost:3000/api/company-digests?workspaceId=ws-1")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
  })

  it("should return digests list for workspace", async () => {
    const now = new Date()
    mockSql.mockResolvedValue({
      rows: [
        {
          id: "digest-1",
          org_id: "org-1",
          workspace_id: "ws-1",
          title: "Weekly Digest",
          period_type: "weekly",
          period_start: "2026-03-01",
          period_end: "2026-03-07",
          content: {
            title: "Weekly Digest",
            executiveSummary: "Good week",
            rockUpdate: "On track",
            keyMetrics: [],
            teamHighlights: [],
            challenges: [],
            outlook: "Positive",
          },
          format: "markdown",
          created_by: "user-1",
          created_at: now,
          updated_at: now,
        },
      ],
    })

    const req = new NextRequest("http://localhost:3000/api/company-digests?workspaceId=ws-1")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
    expect(data.data[0].id).toBe("digest-1")
    expect(data.data[0].title).toBe("Weekly Digest")
    expect(data.data[0].periodType).toBe("weekly")
  })
})

describe("POST /api/company-digests", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
    mockCheckApiRateLimit.mockResolvedValue({ success: true })
    mockCheckCreditsOrRespond.mockResolvedValue({ allowed: true })
    mockSql.mockResolvedValue({ rows: [] })
    mockRecordUsage.mockResolvedValue(undefined)
  })

  function createRequest(body: unknown): NextRequest {
    return new NextRequest("http://localhost:3000/api/company-digests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  }

  it("should return validation error if required fields missing", async () => {
    mockValidateBody.mockRejectedValue(
      new ValidationError("periodType is required", 400)
    )

    const req = createRequest({ workspaceId: "ws-1" })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("periodType is required")
  })

  it("should return 429 if rate limited", async () => {
    mockValidateBody.mockResolvedValue({
      workspaceId: "ws-1",
      periodType: "weekly",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-07",
    })
    mockCheckApiRateLimit.mockResolvedValue({ success: false, remaining: 0 })

    const req = createRequest({
      workspaceId: "ws-1",
      periodType: "weekly",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-07",
    })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Too many requests. Please wait a moment.")
  })

  it("should successfully generate digest and return it", async () => {
    const digestContent = {
      title: "Weekly Company Digest",
      executiveSummary: "Strong performance this week",
      rockUpdate: "3 of 5 rocks on track",
      keyMetrics: [{ name: "Revenue", value: "$10k" }],
      teamHighlights: ["Completed rock: Launch feature"],
      challenges: ["At risk: Migration project"],
      outlook: "Positive momentum going into next week",
    }

    mockValidateBody.mockResolvedValue({
      workspaceId: "ws-1",
      periodType: "weekly",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-07",
    })
    mockGenerateCompanyDigest.mockResolvedValue({
      result: digestContent,
      usage: { model: "claude-3-haiku", inputTokens: 500, outputTokens: 200 },
    })

    const req = createRequest({
      workspaceId: "ws-1",
      periodType: "weekly",
      periodStart: "2026-03-01",
      periodEnd: "2026-03-07",
    })
    const res = await POST(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("digest_test-id")
    expect(data.data.title).toBe("Weekly Company Digest")
    expect(data.data.periodType).toBe("weekly")
    expect(data.data.content).toEqual(digestContent)
    expect(mockRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        action: "company-digest",
      })
    )
  })
})
