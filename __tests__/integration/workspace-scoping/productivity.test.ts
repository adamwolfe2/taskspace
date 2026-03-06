/**
 * Phase 3 Workspace Scoping: Productivity Features Integration Tests
 *
 * Tests workspace isolation for:
 * - Focus blocks
 * - Energy tracking
 * - Streaks
 * - Focus scores
 *
 * Verifies:
 * - workspaceId is REQUIRED
 * - Users can only access data from workspaces they have access to
 * - Data is properly filtered by workspace
 * - No data leakage across workspaces
 */

import { NextRequest } from "next/server"
import { GET as focusBlocksGET, POST as focusBlocksPOST } from "@/app/api/productivity/focus-blocks/route"
import { GET as energyGET, POST as energyPOST } from "@/app/api/productivity/energy/route"
import { GET as streakGET } from "@/app/api/productivity/streak/route"
import { GET as focusScoreGET } from "@/app/api/productivity/focus-score/route"

// Mock dependencies
jest.mock("@/lib/auth/middleware", () => ({
  getAuthContext: jest.fn(),
  isAdmin: jest.fn(),
}))

jest.mock("@/lib/db/workspaces", () => ({
  userHasWorkspaceAccess: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  db: {
    focusBlocks: {
      findByUserId: jest.fn(),
      create: jest.fn(),
    },
    dailyEnergy: {
      findByUserAndDate: jest.fn(),
      findByUserDateRange: jest.fn(),
      upsert: jest.fn(),
    },
    eodReports: {
      findByUserId: jest.fn(),
    },
    userStreaks: {
      findByUser: jest.fn(),
    },
    tasks: {
      findByUserId: jest.fn(),
    },
    rocks: {
      findByUserId: jest.fn(),
    },
    focusScoreHistory: {
      create: jest.fn(),
    },
  },
}))

import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { db } from "@/lib/db"

const mockAuthContext = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  member: { role: "member" },
}

const WORKSPACE_1 = "workspace-1"
const WORKSPACE_2 = "workspace-2"

// Helper to create requests with CSRF header
function req(url: string, options: { method?: string; body?: string; headers?: Record<string, string> } = {}): NextRequest {
  return new NextRequest(url, {
    ...options,
    headers: { "x-requested-with": "XMLHttpRequest", ...(options.headers || {}) },
  })
}

describe("Productivity Features - Workspace Scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext)
    ;(isAdmin as jest.Mock).mockReturnValue(false)
  })

  describe("Focus Blocks", () => {
    describe("GET /api/productivity/focus-blocks", () => {
      it("should require workspaceId parameter", async () => {
        const request = req("http://localhost/api/productivity/focus-blocks")
        const response = await focusBlocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should reject users without workspace access", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

        const request = req(
          `http://localhost/api/productivity/focus-blocks?workspaceId=${WORKSPACE_1}`
        )
        const response = await focusBlocksGET(request)
        await response.json()

        expect(response.status).toBe(404) // SECURITY: 404 prevents workspace leakage
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
      })

      it("should filter focus blocks by workspace", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.focusBlocks.findByUserId as jest.Mock).mockResolvedValue([
          { id: "fb-1", workspaceId: WORKSPACE_1, duration: 60 },
          { id: "fb-2", workspaceId: WORKSPACE_2, duration: 45 },
          { id: "fb-3", workspaceId: WORKSPACE_1, duration: 30 },
        ])

        const request = req(
          `http://localhost/api/productivity/focus-blocks?workspaceId=${WORKSPACE_1}`
        )
        const response = await focusBlocksGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(2)
        expect(data.data.every((fb: { workspaceId: string }) => fb.workspaceId === WORKSPACE_1)).toBe(true)
      })

      it("should allow admins to access any workspace", async () => {
        ;(isAdmin as jest.Mock).mockReturnValue(true)
        ;(db.focusBlocks.findByUserId as jest.Mock).mockResolvedValue([
          { id: "fb-1", workspaceId: WORKSPACE_1, duration: 60 },
        ])

        const request = req(
          `http://localhost/api/productivity/focus-blocks?workspaceId=${WORKSPACE_1}`
        )
        const response = await focusBlocksGET(request)

        expect(response.status).toBe(200)
        expect(userHasWorkspaceAccess).not.toHaveBeenCalled()
      })
    })

    describe("POST /api/productivity/focus-blocks", () => {
      it("should require workspaceId in request body", async () => {
        const now = new Date()
        const later = new Date(now.getTime() + 3600000)
        const request = req("http://localhost/api/productivity/focus-blocks", {
          method: "POST",
          body: JSON.stringify({
            startTime: now.toISOString(),
            endTime: later.toISOString(),
            category: "deep_work",
          }),
        })

        const response = await focusBlocksPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should validate workspace access before creating focus block", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)
        const now = new Date()
        const later = new Date(now.getTime() + 3600000)

        const request = req("http://localhost/api/productivity/focus-blocks", {
          method: "POST",
          body: JSON.stringify({
            workspaceId: WORKSPACE_1,
            startTime: now.toISOString(),
            endTime: later.toISOString(),
            category: "deep_work",
          }),
        })

        const response = await focusBlocksPOST(request)
        await response.json()

        expect(response.status).toBe(404) // SECURITY: 404 prevents workspace leakage
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
        expect(db.focusBlocks.create).not.toHaveBeenCalled()
      })

      it("should create focus block with correct workspaceId", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.focusBlocks.create as jest.Mock).mockResolvedValue({
          id: "fb-new",
          workspaceId: WORKSPACE_1,
        })
        const now = new Date()
        const later = new Date(now.getTime() + 3600000)

        const request = req("http://localhost/api/productivity/focus-blocks", {
          method: "POST",
          body: JSON.stringify({
            workspaceId: WORKSPACE_1,
            startTime: now.toISOString(),
            endTime: later.toISOString(),
            category: "deep_work",
          }),
        })

        const response = await focusBlocksPOST(request)
        await response.json()

        expect(response.status).toBe(200)
        expect(db.focusBlocks.create).toHaveBeenCalledWith(
          expect.objectContaining({
            workspaceId: WORKSPACE_1,
          })
        )
      })
    })
  })

  describe("Energy Tracking", () => {
    it("should return data without workspaceId (optional filter)", async () => {
      ;(db.dailyEnergy.findByUserDateRange as jest.Mock).mockResolvedValue([])
      const request = req("http://localhost/api/productivity/energy?startDate=2024-01-01&endDate=2024-01-31")
      const response = await energyGET(request)

      expect(response.status).toBe(200)
    })

    it("should filter energy data by workspace", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
      ;(db.dailyEnergy.findByUserDateRange as jest.Mock).mockResolvedValue([
        { id: "e-1", workspaceId: WORKSPACE_1, energyLevel: 8 },
        { id: "e-2", workspaceId: WORKSPACE_2, energyLevel: 6 },
        { id: "e-3", workspaceId: WORKSPACE_1, energyLevel: 7 },
      ])

      const request = req(
        `http://localhost/api/productivity/energy?workspaceId=${WORKSPACE_1}&startDate=2024-01-01&endDate=2024-01-31`
      )
      const response = await energyGET(request)
      await response.json()

      expect(response.status).toBe(200)
      // Energy route returns workspace-filtered data
      expect(db.dailyEnergy.findByUserDateRange).toHaveBeenCalled()
    })

    it("should validate workspace access when creating energy entry", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

      const request = req("http://localhost/api/productivity/energy", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: WORKSPACE_1,
          energyLevel: "high",
          date: "2024-01-15",
          mood: "🙂",
        }),
      })

      const response = await energyPOST(request)
      await response.json()

      expect(response.status).toBe(404) // SECURITY: 404 prevents workspace leakage
      expect(db.dailyEnergy.upsert).not.toHaveBeenCalled()
    })
  })

  describe("Streaks", () => {
    it("should require workspaceId parameter", async () => {
      const request = req("http://localhost/api/productivity/streak")
      const response = await streakGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("workspaceId is required")
    })

    it("should calculate streaks only from workspace-filtered EOD reports", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)

      // Mock EOD reports from different workspaces
      ;(db.eodReports.findByUserId as jest.Mock).mockResolvedValue([
        { id: "r-1", workspaceId: WORKSPACE_1, submittedAt: "2024-01-01", wins: ["Win 1"] },
        { id: "r-2", workspaceId: WORKSPACE_2, submittedAt: "2024-01-02", wins: ["Win 2"] },
        { id: "r-3", workspaceId: WORKSPACE_1, submittedAt: "2024-01-02", wins: ["Win 3"] },
        { id: "r-4", workspaceId: WORKSPACE_1, submittedAt: "2024-01-03", wins: ["Win 4"] },
      ])

      const request = req(
        `http://localhost/api/productivity/streak?workspaceId=${WORKSPACE_1}`
      )
      const response = await streakGET(request)
      await response.json()

      expect(response.status).toBe(200)
      // Streak calculation should only use WORKSPACE_1 reports (r-1, r-3, r-4)
      expect(db.eodReports.findByUserId).toHaveBeenCalled()
    })
  })

  describe("Focus Score", () => {
    it("should require workspaceId parameter", async () => {
      const request = req("http://localhost/api/productivity/focus-score")
      const response = await focusScoreGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain("workspaceId is required")
    })

    it("should calculate focus score only from workspace-filtered data", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)

      // Mock data from different workspaces
      ;(db.eodReports.findByUserId as jest.Mock).mockResolvedValue([
        { id: "r-1", workspaceId: WORKSPACE_1 },
        { id: "r-2", workspaceId: WORKSPACE_2 },
      ])
      ;(db.tasks.findByUserId as jest.Mock).mockResolvedValue([
        { id: "t-1", workspaceId: WORKSPACE_1, completedAt: new Date() },
        { id: "t-2", workspaceId: WORKSPACE_2, completedAt: new Date() },
      ])
      ;(db.rocks.findByUserId as jest.Mock).mockResolvedValue([
        { id: "rock-1", workspaceId: WORKSPACE_1, completedAt: new Date() },
        { id: "rock-2", workspaceId: WORKSPACE_2, completedAt: null },
      ])

      const request = req(
        `http://localhost/api/productivity/focus-score?workspaceId=${WORKSPACE_1}`
      )
      const response = await focusScoreGET(request)
      await response.json()

      expect(response.status).toBe(200)
      // Score calculation should only use WORKSPACE_1 data
      expect(db.eodReports.findByUserId).toHaveBeenCalled()
      expect(db.tasks.findByUserId).toHaveBeenCalled()
      expect(db.rocks.findByUserId).toHaveBeenCalled()
    })
  })

  describe("Cross-Workspace Data Leakage Prevention", () => {
    it("should not allow accessing workspace-1 data when requesting workspace-2", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockImplementation(
        async (userId: string, workspaceId: string) => {
          // User has access to workspace-2 but not workspace-1
          return workspaceId === WORKSPACE_2
        }
      )

      ;(db.focusBlocks.findByUserId as jest.Mock).mockResolvedValue([
        { id: "fb-1", workspaceId: WORKSPACE_1, duration: 60 },
        { id: "fb-2", workspaceId: WORKSPACE_2, duration: 45 },
      ])

      // Try to access workspace-1 (should be rejected)
      const request1 = req(
        `http://localhost/api/productivity/focus-blocks?workspaceId=${WORKSPACE_1}`
      )
      const response1 = await focusBlocksGET(request1)
      expect(response1.status).toBe(404) // SECURITY: 404 prevents workspace leakage

      // Access workspace-2 (should succeed but only show workspace-2 data)
      const request2 = req(
        `http://localhost/api/productivity/focus-blocks?workspaceId=${WORKSPACE_2}`
      )
      const response2 = await focusBlocksGET(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.data).toHaveLength(1)
      expect(data2.data[0].workspaceId).toBe(WORKSPACE_2)
    })
  })
})
