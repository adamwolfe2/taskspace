/**
 * Tasks API Tests
 *
 * Tests auth guards for /api/tasks
 */

import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  db: {
    assignedTasks: {
      findPaginated: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByAssigneeId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    },
    rocks: { findById: jest.fn() },
    members: { findByOrgAndUser: jest.fn() },
    sessions: { findByToken: jest.fn(), update: jest.fn() },
    organizations: { findById: jest.fn() },
    users: { findById: jest.fn() },
    notifications: { create: jest.fn() },
  },
}))

jest.mock("@/lib/db/workspaces", () => ({
  getWorkspaceById: jest.fn(),
  userHasWorkspaceAccess: jest.fn().mockResolvedValue(true),
}))

jest.mock("@/lib/auth/password", () => ({
  isTokenExpired: jest.fn((expiresAt: string) => new Date(expiresAt) < new Date()),
  generateId: jest.fn(() => "task-id-" + Date.now()),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
  logError: jest.fn(),
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: jest.fn((request: any) => request.json()),
  ValidationError: class ValidationError extends Error { statusCode = 400 },
}))

jest.mock("@/lib/auth/rate-limit", () => ({
  checkOrgRateLimit: jest.fn().mockReturnValue({ success: true }),
  getRateLimitHeaders: jest.fn().mockReturnValue({}),
}))

jest.mock("@/lib/integrations/slack", () => ({
  sendSlackMessage: jest.fn(),
  buildTaskAssignmentMessage: jest.fn(),
  isSlackConfigured: jest.fn().mockReturnValue(false),
}))

jest.mock("@/lib/integrations/asana", () => ({
  asanaClient: { isConfigured: jest.fn().mockReturnValue(false), createTask: jest.fn() },
}))

import { GET, POST } from "@/app/api/tasks/route"
import { db } from "@/lib/db"

const mockFindByToken = db.sessions.findByToken as jest.Mock

describe("Tasks API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  function createUnauthenticatedRequest(url: string, method: string = "GET"): NextRequest {
    mockFindByToken.mockResolvedValue(null)
    return new NextRequest(url, {
      method,
      headers: { "x-requested-with": "XMLHttpRequest" },
    })
  }

  describe("GET /api/tasks", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createUnauthenticatedRequest(
        "http://localhost:3000/api/tasks?workspaceId=workspace-1"
      )
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/tasks", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createUnauthenticatedRequest("http://localhost:3000/api/tasks", "POST")
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
