/**
 * EOD Reports API Tests
 *
 * Tests auth guards and basic request validation for /api/eod-reports
 */

import { NextRequest } from "next/server"

jest.mock("@/lib/db", () => ({
  db: {
    eodReports: {
      findPaginated: jest.fn(),
      findByUserIdsWithDateRange: jest.fn(),
      findByUserAndDate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
    },
    members: {
      findWithUsersByOrganizationId: jest.fn(),
      findByOrgAndUser: jest.fn(),
    },
    sessions: {
      findByToken: jest.fn(),
      update: jest.fn(),
    },
    organizations: {
      findById: jest.fn(),
    },
    users: {
      findById: jest.fn(),
    },
  },
}))

jest.mock("@/lib/db/workspaces", () => ({
  getWorkspaceById: jest.fn(),
  userHasWorkspaceAccess: jest.fn().mockResolvedValue(true),
}))

jest.mock("@/lib/auth/password", () => ({
  isTokenExpired: jest.fn((expiresAt: string) => new Date(expiresAt) < new Date()),
  generateId: jest.fn(() => "test-id-" + Date.now()),
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

jest.mock("@/lib/ai/claude-client", () => ({
  parseEODReport: jest.fn(),
  isClaudeConfigured: jest.fn().mockReturnValue(false),
}))

jest.mock("@/lib/ai/eod-suggestions", () => ({
  generateEODSuggestions: jest.fn(),
}))

jest.mock("@/lib/integrations/email", () => ({
  sendEscalationNotification: jest.fn(),
  sendAIAlertEmail: jest.fn(),
  isEmailConfigured: jest.fn().mockReturnValue(false),
}))

jest.mock("@/lib/integrations/slack", () => ({
  sendSlackMessage: jest.fn(),
  buildFullEODReportMessage: jest.fn(),
  isSlackConfigured: jest.fn().mockReturnValue(false),
}))

jest.mock("@/lib/integrations/asana", () => ({
  asanaClient: { isConfigured: jest.fn().mockReturnValue(false) },
}))

jest.mock("@/lib/metrics", () => ({
  getActiveMetricForUser: jest.fn().mockResolvedValue(null),
  upsertWeeklyMetricEntry: jest.fn(),
}))

jest.mock("@/lib/utils/date-utils", () => ({
  getTodayInTimezone: jest.fn(() => "2026-02-12"),
  isValidEODDate: jest.fn(() => true),
  formatDateForDisplay: jest.fn((d: string) => d),
}))

import { GET, POST } from "@/app/api/eod-reports/route"
import { db } from "@/lib/db"

const mockFindByToken = db.sessions.findByToken as jest.Mock
const mockSessionUpdate = db.sessions.update as jest.Mock
const mockOrgFindById = db.organizations.findById as jest.Mock
const mockFindByOrgAndUser = db.members.findByOrgAndUser as jest.Mock
const mockUserFindById = db.users.findById as jest.Mock

describe("EOD Reports API", () => {
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

  describe("GET /api/eod-reports", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createUnauthenticatedRequest(
        "http://localhost:3000/api/eod-reports?workspaceId=workspace-1"
      )
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("POST /api/eod-reports", () => {
    it("should return 401 when not authenticated", async () => {
      const req = createUnauthenticatedRequest(
        "http://localhost:3000/api/eod-reports",
        "POST"
      )
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Unauthorized")
    })
  })
})
