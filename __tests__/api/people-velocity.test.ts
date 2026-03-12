/**
 * People Velocity API Tests
 *
 * Tests GET and POST /api/people-velocity
 */

import { NextRequest } from "next/server"

const mockSql = jest.fn()

jest.mock("@/lib/db/sql", () => ({
  sql: (...args: unknown[]) => mockSql(...args),
}))

jest.mock("@/lib/auth/password", () => ({
  generateId: jest.fn(() => "test-id-123"),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
}))

jest.mock("@/lib/validation/middleware", () => {
  const actual = jest.requireActual("@/lib/validation/middleware")
  return {
    ...actual,
    validateBody: jest.fn(),
    ValidationError: actual.ValidationError,
  }
})

import { GET, POST } from "@/app/api/people-velocity/route"
import { validateBody, ValidationError } from "@/lib/validation/middleware"

const mockValidateBody = validateBody as jest.MockedFunction<typeof validateBody>

// Helper to create requests
function req(url: string, options: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(url, {
    ...options,
    headers: { "x-requested-with": "XMLHttpRequest", ...(options.headers as Record<string, string> || {}) },
  } as RequestInit)
}

const mockAuth = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org", settings: {} },
  member: { role: "member" },
  sessionId: "session-1",
}

describe("GET /api/people-velocity", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  it("should return 400 if workspaceId is missing", async () => {
    const request = req("http://localhost:3000/api/people-velocity")
    const res = await GET(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("workspaceId is required")
  })

  it("should return empty array when no members found", async () => {
    // Members query returns empty
    mockSql.mockResolvedValueOnce({ rows: [] })

    const request = req("http://localhost:3000/api/people-velocity?workspaceId=ws-1")
    const res = await GET(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
  })

  it("should return cached velocity data for workspace members", async () => {
    const now = new Date()
    const weekStart = new Date(now)
    const day = weekStart.getDay()
    weekStart.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split("T")[0]

    // 1. Members query
    mockSql.mockResolvedValueOnce({
      rows: [
        { user_id: "user-1", name: "Test User", email: "test@example.com" },
        { user_id: "user-2", name: "Other User", email: "other@example.com" },
      ],
    })

    // 2. Cached results — return data for both users for current week
    //    week_start and computed_at must be Date objects (rowToVelocity calls .toISOString())
    mockSql.mockResolvedValueOnce({
      rows: [
        {
          id: "pv-1",
          org_id: "org-1",
          user_id: "user-1",
          week_start: new Date(weekStartStr),
          metrics: {
            tasksCompleted: 5,
            tasksDue: 8,
            rockMilestonesHit: 2,
            eodStreak: 4,
            avgMood: 4.2,
            velocityScore: 72,
          },
          computed_at: now,
        },
        {
          id: "pv-2",
          org_id: "org-1",
          user_id: "user-2",
          week_start: new Date(weekStartStr),
          metrics: {
            tasksCompleted: 3,
            tasksDue: 5,
            rockMilestonesHit: 1,
            eodStreak: 3,
            avgMood: 3.5,
            velocityScore: 60,
          },
          computed_at: now,
        },
      ],
    })

    const request = req("http://localhost:3000/api/people-velocity?workspaceId=ws-1&weeks=1")
    const res = await GET(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(2)
    expect(data.data[0].userId).toBe("user-1")
    expect(data.data[0].metrics.tasksCompleted).toBe(5)
    expect(data.data[1].userId).toBe("user-2")
    // No compute calls since cache had all users for current week
    expect(mockSql).toHaveBeenCalledTimes(2)
  })

  it("should compute fresh velocity for current week when cache misses", async () => {
    // 1. Members query — one user
    mockSql.mockResolvedValueOnce({
      rows: [{ user_id: "user-1", name: "Test User", email: "test@example.com" }],
    })

    // 2. Cache query — empty (cache miss)
    mockSql.mockResolvedValueOnce({ rows: [] })

    // computeAndCacheVelocity makes 6 SQL calls for the missing user:
    // 3. tasksCompleted count
    mockSql.mockResolvedValueOnce({ rows: [{ count: "3" }] })
    // 4. tasksDue count
    mockSql.mockResolvedValueOnce({ rows: [{ count: "5" }] })
    // 5. rockMilestonesHit count
    mockSql.mockResolvedValueOnce({ rows: [{ count: "1" }] })
    // 6. eodStreak count
    mockSql.mockResolvedValueOnce({ rows: [{ count: "4" }] })
    // 7. avgMood
    mockSql.mockResolvedValueOnce({ rows: [{ avg_mood: "4.0" }] })
    // 8. Upsert into cache
    mockSql.mockResolvedValueOnce({ rows: [] })

    const request = req("http://localhost:3000/api/people-velocity?workspaceId=ws-1&weeks=1")
    const res = await GET(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)

    const velocity = data.data[0]
    expect(velocity.id).toBe("pv_test-id-123")
    expect(velocity.orgId).toBe("org-1")
    expect(velocity.userId).toBe("user-1")
    expect(velocity.metrics.tasksCompleted).toBe(3)
    expect(velocity.metrics.tasksDue).toBe(5)
    expect(velocity.metrics.rockMilestonesHit).toBe(1)
    expect(velocity.metrics.eodStreak).toBe(4)
    expect(velocity.metrics.avgMood).toBe(4)
    // velocityScore = round(0.6*40 + 0.8*30 + 0.333*20 + 0.8*10) = round(24+24+6.67+8) = 63
    expect(velocity.metrics.velocityScore).toBe(63)
    // 2 (members+cache) + 6 (compute) = 8 SQL calls
    expect(mockSql).toHaveBeenCalledTimes(8)
  })

  it("should respect userId filter parameter", async () => {
    // 1. Members query — filtered to single user
    mockSql.mockResolvedValueOnce({
      rows: [{ user_id: "user-2", name: "Other User", email: "other@example.com" }],
    })

    // 2. Cache query — has data for this user
    const weekStart = new Date()
    const day = weekStart.getDay()
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1))
    const weekStartStr = weekStart.toISOString().split("T")[0]

    // Build the week_start the same way the route does (local timezone aware)
    const routeToday = new Date()
    const routeDay = routeToday.getDay()
    const routeMonday = new Date(routeToday)
    routeMonday.setDate(routeToday.getDate() - (routeDay === 0 ? 6 : routeDay - 1))
    routeMonday.setHours(0, 0, 0, 0)
    const routeWeekStart = routeMonday.toISOString().split("T")[0]

    mockSql.mockResolvedValueOnce({
      rows: [
        {
          id: "pv-3",
          org_id: "org-1",
          user_id: "user-2",
          week_start: routeMonday,
          metrics: {
            tasksCompleted: 7,
            tasksDue: 10,
            rockMilestonesHit: 3,
            eodStreak: 5,
            avgMood: 4.5,
            velocityScore: 85,
          },
          computed_at: new Date(),
        },
      ],
    })

    const request = req("http://localhost:3000/api/people-velocity?workspaceId=ws-1&userId=user-2&weeks=1")
    const res = await GET(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.length).toBeGreaterThanOrEqual(1)
    const userVelocity = data.data.find((v: any) => v.userId === "user-2")
    expect(userVelocity).toBeDefined()
    expect(userVelocity.metrics.velocityScore).toBe(85)
    expect(userVelocity.weekStart).toBe(routeWeekStart)
    // Only 2 SQL calls (members + cache) since cache has current week data
    expect(mockSql).toHaveBeenCalledTimes(2)
  })
})

describe("POST /api/people-velocity", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
  })

  it("should return 400 if workspaceId is missing (validation error)", async () => {
    mockValidateBody.mockRejectedValueOnce(
      new ValidationError("workspaceId: workspaceId is required")
    )

    const request = req("http://localhost:3000/api/people-velocity", {
      method: "POST",
    })
    const res = await POST(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain("workspaceId")
  })

  it("should recompute and return velocity for current user", async () => {
    mockValidateBody.mockResolvedValueOnce({ workspaceId: "ws-1" })

    // computeAndCacheVelocity: 6 SQL calls
    mockSql.mockResolvedValueOnce({ rows: [{ count: "2" }] }) // tasksCompleted
    mockSql.mockResolvedValueOnce({ rows: [{ count: "4" }] }) // tasksDue
    mockSql.mockResolvedValueOnce({ rows: [{ count: "0" }] }) // rockMilestonesHit
    mockSql.mockResolvedValueOnce({ rows: [{ count: "3" }] }) // eodStreak
    mockSql.mockResolvedValueOnce({ rows: [{ avg_mood: "3.5" }] }) // avgMood
    mockSql.mockResolvedValueOnce({ rows: [] }) // upsert cache

    const request = req("http://localhost:3000/api/people-velocity", {
      method: "POST",
    })
    const res = await POST(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe("pv_test-id-123")
    expect(data.data.userId).toBe("user-1") // defaults to auth user
    expect(data.data.orgId).toBe("org-1")
    expect(data.data.metrics.tasksCompleted).toBe(2)
    expect(data.data.metrics.tasksDue).toBe(4)
    expect(data.data.metrics.rockMilestonesHit).toBe(0)
    expect(data.data.metrics.eodStreak).toBe(3)
    expect(data.data.metrics.avgMood).toBe(3.5)
    // velocityScore = round(0.5*40 + 0.6*30 + 0*20 + 0.7*10) = round(20+18+0+7) = 45
    expect(data.data.metrics.velocityScore).toBe(45)
    expect(mockSql).toHaveBeenCalledTimes(6)
  })

  it("should accept optional userId to compute for a different user", async () => {
    mockValidateBody.mockResolvedValueOnce({ workspaceId: "ws-1", userId: "user-99" })

    // computeAndCacheVelocity: 6 SQL calls
    mockSql.mockResolvedValueOnce({ rows: [{ count: "10" }] }) // tasksCompleted
    mockSql.mockResolvedValueOnce({ rows: [{ count: "10" }] }) // tasksDue
    mockSql.mockResolvedValueOnce({ rows: [{ count: "3" }] }) // rockMilestonesHit
    mockSql.mockResolvedValueOnce({ rows: [{ count: "5" }] }) // eodStreak
    mockSql.mockResolvedValueOnce({ rows: [{ avg_mood: "5.0" }] }) // avgMood
    mockSql.mockResolvedValueOnce({ rows: [] }) // upsert cache

    const request = req("http://localhost:3000/api/people-velocity", {
      method: "POST",
    })
    const res = await POST(request, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.userId).toBe("user-99") // uses provided userId, not auth user
    expect(data.data.metrics.tasksCompleted).toBe(10)
    expect(data.data.metrics.tasksDue).toBe(10)
    expect(data.data.metrics.rockMilestonesHit).toBe(3)
    expect(data.data.metrics.eodStreak).toBe(5)
    expect(data.data.metrics.avgMood).toBe(5)
    // velocityScore = round(1*40 + 1*30 + 1*20 + 1*10) = 100
    expect(data.data.metrics.velocityScore).toBe(100)
  })
})
