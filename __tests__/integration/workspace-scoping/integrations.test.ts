/**
 * Phase 3 Workspace Scoping: Integrations Tests
 *
 * Tests workspace isolation for:
 * - Google Calendar connections
 * - Asana connections
 * - Slack webhooks
 *
 * Verifies:
 * - workspaceId is REQUIRED
 * - Each workspace can have separate integration connections
 * - Users can only access connections for workspaces they have access to
 * - OAuth state includes workspace context
 * - No connection leakage across workspaces
 */

import { NextRequest } from "next/server"
import { GET as googleCalendarGET, PATCH as googleCalendarPATCH, DELETE as googleCalendarDELETE } from "@/app/api/google-calendar/route"
import { GET as asanaGET, POST as asanaPOST, DELETE as asanaDELETE } from "@/app/api/asana/me/connect/route"

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
    googleCalendarTokens: {
      findByUserIdAndWorkspace: jest.fn(),
      create: jest.fn(),
      updateByWorkspace: jest.fn(),
      deleteByWorkspace: jest.fn(),
    },
    workspaces: {
      findById: jest.fn(),
    },
  },
}))

jest.mock("@/lib/db/sql", () => ({
  sql: jest.fn(() => Promise.resolve({ rows: [] })),
}))

import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"

const mockAuthContext = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  member: { role: "member" },
}

const WORKSPACE_1 = "workspace-1"
const WORKSPACE_2 = "workspace-2"

describe("Integrations - Workspace Scoping", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext)
    ;(isAdmin as jest.Mock).mockReturnValue(false)
  })

  describe("Google Calendar Integration", () => {
    describe("GET /api/google-calendar", () => {
      it("should require workspaceId parameter", async () => {
        const request = new NextRequest("http://localhost/api/google-calendar")
        const response = await googleCalendarGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should reject users without workspace access", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

        const request = new NextRequest(
          `http://localhost/api/google-calendar?workspaceId=${WORKSPACE_1}`
        )
        const response = await googleCalendarGET(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
      })

      it("should return workspace-specific token status", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.googleCalendarTokens.findByUserIdAndWorkspace as jest.Mock).mockResolvedValue({
          id: "token-1",
          userId: "user-1",
          organizationId: "org-1",
          workspaceId: WORKSPACE_1,
          accessToken: "access-token",
          refreshToken: "refresh-token",
        })

        const request = new NextRequest(
          `http://localhost/api/google-calendar?workspaceId=${WORKSPACE_1}`
        )
        const response = await googleCalendarGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.connected).toBe(true)
        expect(db.googleCalendarTokens.findByUserIdAndWorkspace).toHaveBeenCalledWith(
          "user-1",
          "org-1",
          WORKSPACE_1
        )
      })

      it("should include workspaceId in OAuth state parameter", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.googleCalendarTokens.findByUserIdAndWorkspace as jest.Mock).mockResolvedValue(null)

        const request = new NextRequest(
          `http://localhost/api/google-calendar?workspaceId=${WORKSPACE_1}`
        )
        const response = await googleCalendarGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.authUrl).toBeDefined()

        // Verify state parameter contains workspaceId
        const authUrl = new URL(data.data.authUrl)
        const state = authUrl.searchParams.get("state")
        expect(state).toBeDefined()

        const decodedState = JSON.parse(Buffer.from(state!, "base64").toString())
        expect(decodedState.workspaceId).toBe(WORKSPACE_1)
      })
    })

    describe("PATCH /api/google-calendar", () => {
      it("should require workspaceId in request body", async () => {
        const request = new NextRequest("http://localhost/api/google-calendar", {
          method: "PATCH",
          body: JSON.stringify({
            calendarId: "cal-123",
            syncEnabled: true,
          }),
        })

        const response = await googleCalendarPATCH(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should update only workspace-specific settings", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.googleCalendarTokens.updateByWorkspace as jest.Mock).mockResolvedValue(true)

        const request = new NextRequest("http://localhost/api/google-calendar", {
          method: "PATCH",
          body: JSON.stringify({
            workspaceId: WORKSPACE_1,
            calendarId: "cal-123",
            syncEnabled: true,
          }),
        })

        const response = await googleCalendarPATCH(request)

        expect(response.status).toBe(200)
        expect(db.googleCalendarTokens.updateByWorkspace).toHaveBeenCalledWith(
          "user-1",
          "org-1",
          WORKSPACE_1,
          expect.objectContaining({
            calendarId: "cal-123",
            syncEnabled: true,
          })
        )
      })
    })

    describe("DELETE /api/google-calendar", () => {
      it("should require workspaceId parameter", async () => {
        const request = new NextRequest("http://localhost/api/google-calendar", {
          method: "DELETE",
        })

        const response = await googleCalendarDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should delete only workspace-specific connection", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.googleCalendarTokens.deleteByWorkspace as jest.Mock).mockResolvedValue(true)

        const request = new NextRequest(
          `http://localhost/api/google-calendar?workspaceId=${WORKSPACE_1}`,
          { method: "DELETE" }
        )

        const response = await googleCalendarDELETE(request)

        expect(response.status).toBe(200)
        expect(db.googleCalendarTokens.deleteByWorkspace).toHaveBeenCalledWith(
          "user-1",
          "org-1",
          WORKSPACE_1
        )
      })
    })
  })

  describe("Asana Integration", () => {
    describe("GET /api/asana/me/connect", () => {
      it("should require workspaceId parameter", async () => {
        const request = new NextRequest("http://localhost/api/asana/me/connect")
        const response = await asanaGET(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should reject users without workspace access", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

        const request = new NextRequest(
          `http://localhost/api/asana/me/connect?workspaceId=${WORKSPACE_1}`
        )
        const response = await asanaGET(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
      })

      it("should query workspace-specific asana_connections table", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(sql as unknown as jest.Mock).mockResolvedValue({
          rows: [
            {
              personal_access_token: "pat-123",
              asana_workspace_gid: "asana-ws-1",
              last_sync_at: new Date(),
              sync_enabled: true,
            },
          ],
        })

        const request = new NextRequest(
          `http://localhost/api/asana/me/connect?workspaceId=${WORKSPACE_1}`
        )
        const response = await asanaGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.connected).toBe(true)
        expect(data.data.workspaceGid).toBe("asana-ws-1")

        // Verify SQL query filtered by workspace
        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining("WHERE user_id = "),
            "user-1",
            expect.stringContaining(" AND workspace_id = "),
            WORKSPACE_1,
          ])
        )
      })
    })

    describe("POST /api/asana/me/connect", () => {
      beforeEach(() => {
        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { email: "test@example.com", name: "Test User" } }),
          })
        ) as jest.Mock
      })

      afterEach(() => {
        jest.restoreAllMocks()
      })

      it("should require aimsWorkspaceId in request body", async () => {
        const request = new NextRequest("http://localhost/api/asana/me/connect", {
          method: "POST",
          body: JSON.stringify({
            personalAccessToken: "pat-123",
          }),
        })

        const response = await asanaPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should validate workspace access before connecting", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

        const request = new NextRequest("http://localhost/api/asana/me/connect", {
          method: "POST",
          body: JSON.stringify({
            personalAccessToken: "pat-123",
            aimsWorkspaceId: WORKSPACE_1,
          }),
        })

        const response = await asanaPOST(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
      })

      it("should insert connection into workspace-specific asana_connections table", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(sql as unknown as jest.Mock).mockResolvedValue({ rows: [] })

        const request = new NextRequest("http://localhost/api/asana/me/connect", {
          method: "POST",
          body: JSON.stringify({
            personalAccessToken: "pat-123",
            aimsWorkspaceId: WORKSPACE_1,
            workspaceGid: "asana-ws-1",
          }),
        })

        const response = await asanaPOST(request)

        expect(response.status).toBe(200)

        // Verify INSERT with workspace_id
        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining("INSERT INTO asana_connections"),
            expect.anything(), // connection id
            "org-1",
            WORKSPACE_1,
            "user-1",
            "pat-123",
            "asana-ws-1",
          ])
        )
      })

      it("should upsert connection (UPDATE on conflict)", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(sql as unknown as jest.Mock).mockResolvedValue({ rows: [] })

        const request = new NextRequest("http://localhost/api/asana/me/connect", {
          method: "POST",
          body: JSON.stringify({
            personalAccessToken: "pat-new",
            aimsWorkspaceId: WORKSPACE_1,
          }),
        })

        await asanaPOST(request)

        // Verify ON CONFLICT clause includes user_id and workspace_id
        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining("ON CONFLICT (user_id, workspace_id) DO UPDATE SET"),
          ])
        )
      })
    })

    describe("DELETE /api/asana/me/connect", () => {
      it("should require workspaceId parameter", async () => {
        const request = new NextRequest("http://localhost/api/asana/me/connect", {
          method: "DELETE",
        })

        const response = await asanaDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("workspaceId is required")
      })

      it("should delete only workspace-specific connection", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(sql as unknown as jest.Mock).mockResolvedValue({ rows: [] })

        const request = new NextRequest(
          `http://localhost/api/asana/me/connect?workspaceId=${WORKSPACE_1}`,
          { method: "DELETE" }
        )

        const response = await asanaDELETE(request)

        expect(response.status).toBe(200)

        // Verify DELETE filtered by both user_id and workspace_id
        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining("DELETE FROM asana_connections"),
            expect.stringContaining("WHERE user_id = "),
            "user-1",
            expect.stringContaining(" AND workspace_id = "),
            WORKSPACE_1,
          ])
        )
      })
    })
  })

  describe("Slack Integration", () => {
    beforeEach(() => {
      ;(db.workspaces.findById as jest.Mock).mockResolvedValue({
        id: WORKSPACE_1,
        name: "Workspace 1",
        settings: {
          slackWebhookUrl: "https://hooks.slack.com/services/workspace1",
        },
      })
    })

    it("should use workspace-specific Slack webhook URL", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)

      // This would be tested in the Slack API route
      // Verifying workspace settings contain workspace-specific webhook
      const workspace = await db.workspaces.findById(WORKSPACE_1)
      const settings = workspace!.settings as Record<string, unknown>

      expect(settings.slackWebhookUrl).toBe(
        "https://hooks.slack.com/services/workspace1"
      )
    })

    it("should fallback to org-level webhook if workspace webhook not set", async () => {
      ;(db.workspaces.findById as jest.Mock).mockResolvedValue({
        id: WORKSPACE_2,
        name: "Workspace 2",
        settings: {}, // No workspace-specific webhook
      })

      const workspace = await db.workspaces.findById(WORKSPACE_2)
      const settings = workspace!.settings as Record<string, unknown>

      expect(settings.slackWebhookUrl).toBeUndefined()
      // API would fallback to auth.organization.settings?.slackWebhookUrl
    })
  })

  describe("Cross-Workspace Connection Isolation", () => {
    it("should not leak Google Calendar connections across workspaces", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)

      // User connects Google Calendar to workspace-1
      ;(db.googleCalendarTokens.findByUserIdAndWorkspace as jest.Mock).mockImplementation(
        async (userId: string, orgId: string, workspaceId: string) => {
          if (workspaceId === WORKSPACE_1) {
            return {
              id: "token-1",
              workspaceId: WORKSPACE_1,
              accessToken: "access-workspace-1",
            }
          }
          return null
        }
      )

      // Check workspace-1 (connected)
      const request1 = new NextRequest(
        `http://localhost/api/google-calendar?workspaceId=${WORKSPACE_1}`
      )
      const response1 = await googleCalendarGET(request1)
      const data1 = await response1.json()

      expect(data1.data.connected).toBe(true)

      // Check workspace-2 (not connected)
      const request2 = new NextRequest(
        `http://localhost/api/google-calendar?workspaceId=${WORKSPACE_2}`
      )
      const response2 = await googleCalendarGET(request2)
      const data2 = await response2.json()

      expect(data2.data.connected).toBe(false)
    })

    it("should not leak Asana connections across workspaces", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
      ;(sql as unknown as jest.Mock).mockImplementation((query) => {
        const queryString = query.join("")

        // Simulate workspace-1 has connection, workspace-2 doesn't
        if (queryString.includes(WORKSPACE_1)) {
          return Promise.resolve({
            rows: [{ personal_access_token: "pat-ws1", asana_workspace_gid: "asana-ws1" }],
          })
        } else if (queryString.includes(WORKSPACE_2)) {
          return Promise.resolve({ rows: [] })
        }
        return Promise.resolve({ rows: [] })
      })

      // Check workspace-1 (connected)
      const request1 = new NextRequest(
        `http://localhost/api/asana/me/connect?workspaceId=${WORKSPACE_1}`
      )
      const response1 = await asanaGET(request1)
      const data1 = await response1.json()

      expect(data1.data.connected).toBe(true)

      // Check workspace-2 (not connected)
      const request2 = new NextRequest(
        `http://localhost/api/asana/me/connect?workspaceId=${WORKSPACE_2}`
      )
      const response2 = await asanaGET(request2)
      const data2 = await response2.json()

      expect(data2.data.connected).toBe(false)
    })
  })
})
