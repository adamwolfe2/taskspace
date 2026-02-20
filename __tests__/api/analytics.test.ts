/**
 * Analytics API Tests
 *
 * Tests GET /api/analytics
 */

import { NextRequest } from "next/server"

const mockRocksFindByOrg = jest.fn()
const mockTasksFindByOrg = jest.fn()
const mockEodFindByOrg = jest.fn()
const mockMembersFindWithUsers = jest.fn()
const mockUserHasWorkspaceAccess = jest.fn()
const mockGetWorkspaceMembers = jest.fn()
const mockIsAdmin = jest.fn()

jest.mock("@/lib/db", () => ({
  db: {
    rocks: { findByOrganizationId: (...args: unknown[]) => mockRocksFindByOrg(...args) },
    assignedTasks: { findByOrganizationId: (...args: unknown[]) => mockTasksFindByOrg(...args) },
    eodReports: { findByOrganizationId: (...args: unknown[]) => mockEodFindByOrg(...args) },
    members: { findWithUsersByOrganizationId: (...args: unknown[]) => mockMembersFindWithUsers(...args) },
  },
}))

jest.mock("@/lib/db/workspaces", () => ({
  userHasWorkspaceAccess: (...args: unknown[]) => mockUserHasWorkspaceAccess(...args),
  getWorkspaceMembers: (...args: unknown[]) => mockGetWorkspaceMembers(...args),
}))

jest.mock("@/lib/auth/middleware", () => ({
  isAdmin: (...args: unknown[]) => mockIsAdmin(...args),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
}))

import { GET } from "@/app/api/analytics/route"

const mockAuth = {
  user: { id: "user-1", email: "admin@example.com", name: "Admin User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "admin" as const,
}

// Helper to create empty data
const emptyData = () => {
  mockRocksFindByOrg.mockResolvedValue([])
  mockTasksFindByOrg.mockResolvedValue([])
  mockEodFindByOrg.mockResolvedValue([])
  mockMembersFindWithUsers.mockResolvedValue([])
  mockGetWorkspaceMembers.mockResolvedValue([])
}

describe("GET /api/analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
    mockIsAdmin.mockReturnValue(true) // default: admin
  })

  it("should return 400 when workspaceId is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe("workspaceId is required")
  })

  it("should return 404 when non-admin user lacks workspace access", async () => {
    mockIsAdmin.mockReturnValue(false)
    mockUserHasWorkspaceAccess.mockResolvedValue(false)

    const req = new NextRequest("http://localhost:3000/api/analytics?workspaceId=ws-1")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Workspace not found")
  })

  it("should return analytics data for valid workspace", async () => {
    emptyData()

    const req = new NextRequest("http://localhost:3000/api/analytics?workspaceId=ws-1")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty("metrics")
    expect(data.data).toHaveProperty("rockCompletionData")
    expect(data.data).toHaveProperty("taskCompletionData")
    expect(data.data).toHaveProperty("eodSubmissionData")
    expect(data.data).toHaveProperty("topPerformers")
    expect(data.data).toHaveProperty("activityByDayOfWeek")
  })

  it("should handle 7d dateRange", async () => {
    emptyData()

    const req = new NextRequest("http://localhost:3000/api/analytics?workspaceId=ws-1&dateRange=7d")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    // 7d means 7 data points + today = 8 entries in rockCompletionData
    expect(data.data.rockCompletionData.length).toBeGreaterThanOrEqual(7)
    expect(data.data.rockCompletionData.length).toBeLessThanOrEqual(8)
  })

  it("should calculate completion rates from real data", async () => {
    const wsId = "ws-1"
    mockRocksFindByOrg.mockResolvedValue([
      { id: "r1", workspaceId: wsId, status: "completed", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: "r2", workspaceId: wsId, status: "on-track", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ])
    mockTasksFindByOrg.mockResolvedValue([
      { id: "t1", workspaceId: wsId, status: "completed", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assigneeId: "user-1" },
      { id: "t2", workspaceId: wsId, status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assigneeId: "user-1" },
      { id: "t3", workspaceId: wsId, status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assigneeId: "user-1" },
      { id: "t4", workspaceId: wsId, status: "pending", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), assigneeId: "user-1" },
    ])
    mockEodFindByOrg.mockResolvedValue([])
    mockMembersFindWithUsers.mockResolvedValue([
      { userId: "user-1", name: "Alice", status: "active", avatar: null },
    ])
    mockGetWorkspaceMembers.mockResolvedValue([{ userId: "user-1" }])

    const req = new NextRequest(`http://localhost:3000/api/analytics?workspaceId=${wsId}`)
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.metrics.totalRocks).toBe(2)
    expect(data.data.metrics.completedRocks).toBe(1)
    expect(data.data.metrics.rockCompletionRate).toBe(50)
    expect(data.data.metrics.totalTasks).toBe(4)
    expect(data.data.metrics.completedTasks).toBe(1)
    expect(data.data.metrics.taskCompletionRate).toBe(25)
  })

  it("should skip workspace access check for admin users", async () => {
    mockIsAdmin.mockReturnValue(true)
    emptyData()

    const req = new NextRequest("http://localhost:3000/api/analytics?workspaceId=ws-any")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(mockUserHasWorkspaceAccess).not.toHaveBeenCalled()
  })

  it("should return 500 on DB error", async () => {
    mockRocksFindByOrg.mockRejectedValue(new Error("DB connection lost"))

    const req = new NextRequest("http://localhost:3000/api/analytics?workspaceId=ws-1")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe("Failed to fetch analytics")
  })
})
