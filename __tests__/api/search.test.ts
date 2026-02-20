/**
 * Search API Tests
 *
 * Tests GET /api/search
 */

import { NextRequest } from "next/server"

const mockSql = jest.fn()

jest.mock("@/lib/db/sql", () => ({
  sql: (...args: unknown[]) => mockSql(...args),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

const mockWithAuth = jest.fn((handler: unknown) => handler)
jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: unknown) => mockWithAuth(handler),
}))

jest.mock("@/lib/api/errors", () => ({
  successResponse: (data: unknown) => {
    const { NextResponse } = require("next/server")
    return NextResponse.json({ success: true, data })
  },
  Errors: {
    badRequest: (msg: string) => {
      const { NextResponse } = require("next/server")
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    },
  },
}))

import { GET } from "@/app/api/search/route"

const mockAuth = {
  user: { id: "user-1", email: "user@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  sessionId: "session-1",
  role: "member" as const,
}

describe("GET /api/search", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWithAuth.mockImplementation((h) => h)
    // Default: return empty rows for all sql calls
    mockSql.mockResolvedValue({ rows: [] })
  })

  it("should return empty array when query is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/search")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
    expect(mockSql).not.toHaveBeenCalled()
  })

  it("should return empty array when query is less than 2 characters", async () => {
    const req = new NextRequest("http://localhost:3000/api/search?q=a")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toEqual([])
    expect(mockSql).not.toHaveBeenCalled()
  })

  it("should return empty array when no matches found", async () => {
    mockSql.mockResolvedValue({ rows: [] })

    const req = new NextRequest("http://localhost:3000/api/search?q=zzznomatch")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toEqual([])
  })

  it("should return tasks in results", async () => {
    const taskRow = { id: "task-1", title: "Write quarterly report", status: "pending", assignee_name: "Alice" }
    mockSql
      .mockResolvedValueOnce({ rows: [taskRow] }) // tasks
      .mockResolvedValueOnce({ rows: [] })         // rocks
      .mockResolvedValueOnce({ rows: [] })         // members

    const req = new NextRequest("http://localhost:3000/api/search?q=quarterly")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toHaveLength(1)
    expect(data.data[0]).toEqual({
      id: "task-1",
      type: "task",
      title: "Write quarterly report",
      subtitle: "Alice",
      status: "pending",
    })
  })

  it("should return rocks in results", async () => {
    const rockRow = { id: "rock-1", title: "Launch product", status: "on-track", owner_name: "Bob" }
    mockSql
      .mockResolvedValueOnce({ rows: [] })          // tasks
      .mockResolvedValueOnce({ rows: [rockRow] })   // rocks
      .mockResolvedValueOnce({ rows: [] })           // members

    const req = new NextRequest("http://localhost:3000/api/search?q=launch")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toHaveLength(1)
    expect(data.data[0]).toEqual({
      id: "rock-1",
      type: "rock",
      title: "Launch product",
      subtitle: "Bob",
      status: "on-track",
    })
  })

  it("should return members in results", async () => {
    const memberRow = { id: "m-1", name: "Alice Smith", role: "admin", department: "Engineering", job_title: "Engineer" }
    mockSql
      .mockResolvedValueOnce({ rows: [] })           // tasks
      .mockResolvedValueOnce({ rows: [] })           // rocks
      .mockResolvedValueOnce({ rows: [memberRow] }) // members

    const req = new NextRequest("http://localhost:3000/api/search?q=alice")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toHaveLength(1)
    expect(data.data[0]).toEqual({
      id: "m-1",
      type: "member",
      title: "Alice Smith",
      subtitle: "Engineer · Engineering",
    })
  })

  it("should return mixed results from all types", async () => {
    mockSql
      .mockResolvedValueOnce({ rows: [{ id: "t-1", title: "Task alpha", status: "pending", assignee_name: null }] })
      .mockResolvedValueOnce({ rows: [{ id: "r-1", title: "Rock alpha", status: "on-track", owner_name: null }] })
      .mockResolvedValueOnce({ rows: [{ id: "m-1", name: "Alpha User", role: "member", department: null, job_title: null }] })

    const req = new NextRequest("http://localhost:3000/api/search?q=alpha")
    const res = await GET(req, mockAuth as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data).toHaveLength(3)
    const types = data.data.map((r: any) => r.type)
    expect(types).toContain("task")
    expect(types).toContain("rock")
    expect(types).toContain("member")
  })
})
