/**
 * Onboarding API Tests
 *
 * Tests the GET /api/onboarding and PUT /api/onboarding endpoints
 */

import { NextRequest } from "next/server"

// Mock auth middleware
const mockAuthContext = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  member: { role: "member" },
  sessionId: "session-1",
}

jest.mock("@/lib/auth/middleware", () => ({
  getAuthContext: jest.fn().mockResolvedValue(mockAuthContext),
  isAdmin: jest.fn().mockReturnValue(false),
  isOwner: jest.fn().mockReturnValue(false),
}))

// Mock sql tagged template
const mockSqlResult = jest.fn()
const mockSql = Object.assign(
  jest.fn((..._args: unknown[]) => mockSqlResult()),
  { query: jest.fn() }
)
jest.mock("@/lib/db/sql", () => ({
  sql: mockSql,
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

import { GET, PUT } from "@/app/api/onboarding/route"
import { isAdmin } from "@/lib/auth/middleware"

function createRequest(method: string, body?: unknown): NextRequest {
  const url = "http://localhost:3000/api/onboarding"
  const headers: Record<string, string> = {}
  // State-changing methods need the CSRF header for withAuth middleware
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["x-requested-with"] = "XMLHttpRequest"
  }
  if (body) {
    headers["Content-Type"] = "application/json"
    return new NextRequest(url, {
      method,
      body: JSON.stringify(body),
      headers,
    })
  }
  return new NextRequest(url, { method, headers })
}

describe("GET /api/onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(isAdmin as jest.Mock).mockReturnValue(false)
  })

  it("should return checklist status for a regular user", async () => {
    // Mock the 7 parallel queries:
    // 1. member dismissed/completed
    // 2. profile (job_title, timezone)
    // 3. rocks
    // 4. eod
    // 5. tasks
    // 6. workspace customization
    // 7. invitations
    const callIndex = 0
    mockSqlResult
      .mockResolvedValueOnce({ rows: [{ onboarding_dismissed: false, onboarding_completed_at: null }] }) // member status
      .mockResolvedValueOnce({ rows: [{ job_title: "Engineer", timezone: "America/New_York" }] }) // profile
      .mockResolvedValueOnce({ rows: [{ has_rocks: true }] }) // rocks
      .mockResolvedValueOnce({ rows: [{ has_eod: false }] }) // eod
      .mockResolvedValueOnce({ rows: [{ has_tasks: true }] }) // tasks
      .mockResolvedValueOnce({ rows: [{ logo_url: null, primary_color: "#dc2626" }] }) // workspace
      .mockResolvedValueOnce({ rows: [{ has_invitations: false }] }) // invitations

    const request = createRequest("GET")
    const response = await GET(request)
    const json = await response.json()

    expect(json.success).toBe(true)
    expect(json.data.items).toHaveLength(5) // Regular user gets 5 items
    expect(json.data.dismissed).toBe(false)

    // Check specific completions
    const profileItem = json.data.items.find((i: { id: string }) => i.id === "profile")
    expect(profileItem.completed).toBe(true)

    const rockItem = json.data.items.find((i: { id: string }) => i.id === "rock")
    expect(rockItem.completed).toBe(true)

    const eodItem = json.data.items.find((i: { id: string }) => i.id === "eod")
    expect(eodItem.completed).toBe(false)
  })

  it("should return 8 items for admin users", async () => {
    ;(isAdmin as jest.Mock).mockReturnValue(true)

    mockSqlResult
      .mockResolvedValueOnce({ rows: [{ onboarding_dismissed: false, onboarding_completed_at: null }] })
      .mockResolvedValueOnce({ rows: [{ job_title: null, timezone: null }] })
      .mockResolvedValueOnce({ rows: [{ has_rocks: false }] })
      .mockResolvedValueOnce({ rows: [{ has_eod: false }] })
      .mockResolvedValueOnce({ rows: [{ has_tasks: false }] })
      .mockResolvedValueOnce({ rows: [{ logo_url: null, primary_color: "#dc2626" }] })
      .mockResolvedValueOnce({ rows: [{ has_invitations: false }] })

    const request = createRequest("GET")
    const response = await GET(request)
    const json = await response.json()

    expect(json.success).toBe(true)
    expect(json.data.items).toHaveLength(8) // Admin gets 8 items
    expect(json.data.completedCount).toBe(0)

    // Verify admin-only items exist
    const adminItems = json.data.items.filter((i: { adminOnly: boolean }) => i.adminOnly)
    expect(adminItems).toHaveLength(3)
  })

  it("should return dismissed=true when user dismissed onboarding", async () => {
    mockSqlResult
      .mockResolvedValueOnce({ rows: [{ onboarding_dismissed: true, onboarding_completed_at: null }] })
      .mockResolvedValueOnce({ rows: [{ job_title: null, timezone: null }] })
      .mockResolvedValueOnce({ rows: [{ has_rocks: false }] })
      .mockResolvedValueOnce({ rows: [{ has_eod: false }] })
      .mockResolvedValueOnce({ rows: [{ has_tasks: false }] })
      .mockResolvedValueOnce({ rows: [{ logo_url: null, primary_color: "#dc2626" }] })
      .mockResolvedValueOnce({ rows: [{ has_invitations: false }] })

    const request = createRequest("GET")
    const response = await GET(request)
    const json = await response.json()

    expect(json.data.dismissed).toBe(true)
  })

  it("should detect workspace customization when logo is set", async () => {
    ;(isAdmin as jest.Mock).mockReturnValue(true)

    mockSqlResult
      .mockResolvedValueOnce({ rows: [{ onboarding_dismissed: false, onboarding_completed_at: null }] })
      .mockResolvedValueOnce({ rows: [{ job_title: "CEO", timezone: "UTC" }] })
      .mockResolvedValueOnce({ rows: [{ has_rocks: false }] })
      .mockResolvedValueOnce({ rows: [{ has_eod: false }] })
      .mockResolvedValueOnce({ rows: [{ has_tasks: false }] })
      .mockResolvedValueOnce({ rows: [{ logo_url: "https://example.com/logo.png", primary_color: "#dc2626" }] })
      .mockResolvedValueOnce({ rows: [{ has_invitations: true }] })

    const request = createRequest("GET")
    const response = await GET(request)
    const json = await response.json()

    const workspaceItem = json.data.items.find((i: { id: string }) => i.id === "workspace")
    expect(workspaceItem.completed).toBe(true)

    const inviteItem = json.data.items.find((i: { id: string }) => i.id === "invite")
    expect(inviteItem.completed).toBe(true)
  })
})

describe("PUT /api/onboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should dismiss onboarding", async () => {
    mockSqlResult.mockResolvedValueOnce({ rows: [] })

    const request = createRequest("PUT", { dismissed: true })
    const response = await PUT(request)
    const json = await response.json()

    expect(json.success).toBe(true)
    expect(mockSql).toHaveBeenCalled()
  })

  it("should complete onboarding", async () => {
    mockSqlResult.mockResolvedValueOnce({ rows: [] })

    const request = createRequest("PUT", { completed: true })
    const response = await PUT(request)
    const json = await response.json()

    expect(json.success).toBe(true)
  })
})
