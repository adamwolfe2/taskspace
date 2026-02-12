/**
 * Rocks API Tests
 *
 * Tests auth guards for /api/rocks
 */

import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  db: {
    rocks: {
      findPaginated: jest.fn(),
      findByOrganizationId: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    },
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
  generateId: jest.fn(() => "rock-id-" + Date.now()),
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

import { GET, POST } from "@/app/api/rocks/route"
import { db } from "@/lib/db"

const mockFindByToken = db.sessions.findByToken as jest.Mock

describe("Rocks API", () => {
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

  describe("GET /api/rocks", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createUnauthenticatedRequest(
        "http://localhost:3000/api/rocks?workspaceId=workspace-1"
      )
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/rocks", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createUnauthenticatedRequest("http://localhost:3000/api/rocks", "POST")
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
