/**
 * Phase 3 Workspace Scoping: Templates and Webhooks Tests
 *
 * Tests dual-scope pattern for:
 * - Task templates (org-wide + workspace-specific)
 * - Webhooks (org-wide + workspace-specific)
 *
 * Verifies:
 * - NULL workspace_id = org-wide (available to all workspaces)
 * - Non-NULL workspace_id = workspace-specific
 * - Proper filtering when workspaceId parameter is provided
 * - Access control for workspace-specific resources
 * - Org-wide resources visible to all workspaces
 */

import { NextRequest } from "next/server"
import { GET as templatesGET, POST as templatesPOST, DELETE as templatesDELETE } from "@/app/api/task-templates/route"
import { GET as webhooksGET, POST as webhooksPOST, PATCH as webhooksPATCH, DELETE as webhooksDELETE } from "@/app/api/webhooks/route"

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
    taskTemplates: {
      findByOrganizationId: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock("@/lib/db/sql", () => ({
  sql: jest.fn(() => Promise.resolve({ rows: [] })),
}))

jest.mock("@/lib/audit/logger", () => ({
  logIntegrationEvent: jest.fn(),
  logSecurityEvent: jest.fn(),
}))

import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"

const mockAuthContext = {
  user: { id: "user-1", email: "test@example.com", name: "Test User" },
  organization: { id: "org-1", name: "Test Org" },
  member: { role: "admin" },
}

const WORKSPACE_1 = "workspace-1"
const WORKSPACE_2 = "workspace-2"

describe("Templates and Webhooks - Dual Scope Pattern", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthContext as jest.Mock).mockResolvedValue(mockAuthContext)
    ;(isAdmin as jest.Mock).mockReturnValue(false)
  })

  describe("Task Templates", () => {
    describe("GET /api/task-templates", () => {
      it("should return all org templates when no workspaceId provided", async () => {
        ;(db.taskTemplates.findByOrganizationId as jest.Mock).mockResolvedValue([
          { id: "t-1", name: "Org Template", workspaceId: null },
          { id: "t-2", name: "WS1 Template", workspaceId: WORKSPACE_1 },
          { id: "t-3", name: "WS2 Template", workspaceId: WORKSPACE_2 },
        ])

        const request = new NextRequest("http://localhost/api/task-templates")
        const response = await templatesGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(3)
      })

      it("should return org-wide + workspace-specific templates when workspaceId provided", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.taskTemplates.findByOrganizationId as jest.Mock).mockResolvedValue([
          { id: "t-1", name: "Org Template", workspaceId: null }, // Org-wide
          { id: "t-2", name: "WS1 Template", workspaceId: WORKSPACE_1 }, // Workspace 1
          { id: "t-3", name: "WS2 Template", workspaceId: WORKSPACE_2 }, // Workspace 2
        ])

        const request = new NextRequest(
          `http://localhost/api/task-templates?workspaceId=${WORKSPACE_1}`
        )
        const response = await templatesGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data).toHaveLength(2) // Org-wide + WS1
        expect(data.data.some((t: any) => t.id === "t-1")).toBe(true) // Org-wide included
        expect(data.data.some((t: any) => t.id === "t-2")).toBe(true) // WS1 included
        expect(data.data.some((t: any) => t.id === "t-3")).toBe(false) // WS2 excluded
      })

      it("should reject users without workspace access", async () => {
        ;(isAdmin as jest.Mock).mockReturnValue(false)
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

        const request = new NextRequest(
          `http://localhost/api/task-templates?workspaceId=${WORKSPACE_1}`
        )
        const response = await templatesGET(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
      })

      it("should allow admins to access any workspace without validation", async () => {
        ;(isAdmin as jest.Mock).mockReturnValue(true)
        ;(db.taskTemplates.findByOrganizationId as jest.Mock).mockResolvedValue([
          { id: "t-1", name: "Template", workspaceId: WORKSPACE_1 },
        ])

        const request = new NextRequest(
          `http://localhost/api/task-templates?workspaceId=${WORKSPACE_1}`
        )
        const response = await templatesGET(request)

        expect(response.status).toBe(200)
        expect(userHasWorkspaceAccess).not.toHaveBeenCalled()
      })
    })

    describe("POST /api/task-templates", () => {
      it("should create org-wide template when workspaceId is not provided", async () => {
        ;(db.taskTemplates.create as jest.Mock).mockResolvedValue({
          id: "t-new",
          workspaceId: null,
        })

        const request = new NextRequest("http://localhost/api/task-templates", {
          method: "POST",
          body: JSON.stringify({
            name: "Org Template",
            title: "Org-wide Task",
            description: "Available to all workspaces",
          }),
        })

        const response = await templatesPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(db.taskTemplates.create).toHaveBeenCalledWith(
          expect.objectContaining({
            workspaceId: null, // Org-wide
          })
        )
      })

      it("should create workspace-specific template when workspaceId is provided", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
        ;(db.taskTemplates.create as jest.Mock).mockResolvedValue({
          id: "t-new",
          workspaceId: WORKSPACE_1,
        })

        const request = new NextRequest("http://localhost/api/task-templates", {
          method: "POST",
          body: JSON.stringify({
            name: "WS Template",
            title: "Workspace Task",
            description: "Only for workspace 1",
            workspaceId: WORKSPACE_1,
          }),
        })

        const response = await templatesPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
        expect(db.taskTemplates.create).toHaveBeenCalledWith(
          expect.objectContaining({
            workspaceId: WORKSPACE_1,
          })
        )
      })

      it("should validate workspace access for workspace-specific templates", async () => {
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

        const request = new NextRequest("http://localhost/api/task-templates", {
          method: "POST",
          body: JSON.stringify({
            name: "WS Template",
            title: "Task",
            workspaceId: WORKSPACE_1,
          }),
        })

        const response = await templatesPOST(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(db.taskTemplates.create).not.toHaveBeenCalled()
      })
    })

    describe("DELETE /api/task-templates", () => {
      it("should validate workspace access for workspace-specific templates", async () => {
        ;(isAdmin as jest.Mock).mockReturnValue(false)
        ;(db.taskTemplates.findById as jest.Mock).mockResolvedValue({
          id: "t-1",
          createdBy: "user-1",
          workspaceId: WORKSPACE_1,
        })
        ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(false)

        const request = new NextRequest("http://localhost/api/task-templates?id=t-1", {
          method: "DELETE",
        })

        const response = await templatesDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(userHasWorkspaceAccess).toHaveBeenCalledWith("user-1", WORKSPACE_1)
        expect(db.taskTemplates.delete).not.toHaveBeenCalled()
      })

      it("should allow deleting org-wide templates without workspace validation", async () => {
        ;(db.taskTemplates.findById as jest.Mock).mockResolvedValue({
          id: "t-1",
          createdBy: "user-1",
          workspaceId: null, // Org-wide
        })
        ;(db.taskTemplates.delete as jest.Mock).mockResolvedValue(true)

        const request = new NextRequest("http://localhost/api/task-templates?id=t-1", {
          method: "DELETE",
        })

        const response = await templatesDELETE(request)

        expect(response.status).toBe(200)
        expect(userHasWorkspaceAccess).not.toHaveBeenCalled()
        expect(db.taskTemplates.delete).toHaveBeenCalledWith("t-1")
      })
    })
  })

  describe("Webhooks", () => {
    describe("GET /api/webhooks", () => {
      it("should return all org webhooks when no workspaceId provided", async () => {
        ;(sql as jest.Mock).mockResolvedValue({
          rows: [
            { id: "wh-1", name: "Org Webhook", workspace_id: null },
            { id: "wh-2", name: "WS1 Webhook", workspace_id: WORKSPACE_1 },
            { id: "wh-3", name: "WS2 Webhook", workspace_id: WORKSPACE_2 },
          ],
        })

        const request = new NextRequest("http://localhost/api/webhooks")
        const response = await webhooksGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.webhooks).toHaveLength(3)
      })

      it("should return org-wide + workspace-specific webhooks when workspaceId provided", async () => {
        ;(sql as jest.Mock).mockResolvedValue({
          rows: [
            { id: "wh-1", name: "Org Webhook", workspace_id: null, secret: "sec1" },
            { id: "wh-2", name: "WS1 Webhook", workspace_id: WORKSPACE_1, secret: "sec2" },
          ],
        })

        const request = new NextRequest(`http://localhost/api/webhooks?workspaceId=${WORKSPACE_1}`)
        const response = await webhooksGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.webhooks).toHaveLength(2)

        // Verify SQL query filters correctly
        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining("WHERE organization_id = "),
            "org-1",
            expect.stringContaining("AND (workspace_id IS NULL OR workspace_id = "),
            WORKSPACE_1,
          ])
        )
      })

      it("should mask secrets in response", async () => {
        ;(sql as jest.Mock).mockResolvedValue({
          rows: [
            {
              id: "wh-1",
              name: "Webhook",
              workspace_id: null,
              secret: "whsec_1234567890abcdef1234567890abcdef",
            },
          ],
        })

        const request = new NextRequest("http://localhost/api/webhooks")
        const response = await webhooksGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.webhooks[0].secret).not.toBe("whsec_1234567890abcdef1234567890abcdef")
        expect(data.data.webhooks[0].secret).toContain("****")
      })
    })

    describe("POST /api/webhooks", () => {
      it("should create org-wide webhook when workspaceId is not provided", async () => {
        ;(sql as jest.Mock).mockResolvedValue({ rows: [{ count: 5 }] })

        const request = new NextRequest("http://localhost/api/webhooks", {
          method: "POST",
          body: JSON.stringify({
            name: "Org Webhook",
            url: "https://example.com/webhook",
            events: ["task.created"],
            enabled: true,
          }),
        })

        const response = await webhooksPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.webhook.scope).toBe("organization")

        // Verify INSERT with NULL workspace_id
        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining("INSERT INTO webhook_configs"),
            expect.anything(),
            "org-1",
            null, // workspace_id = NULL
          ])
        )
      })

      it("should create workspace-specific webhook when workspaceId is provided", async () => {
        ;(sql as jest.Mock).mockResolvedValue({ rows: [{ count: 5 }] })

        const request = new NextRequest("http://localhost/api/webhooks", {
          method: "POST",
          body: JSON.stringify({
            name: "WS Webhook",
            url: "https://example.com/webhook",
            events: ["task.created"],
            enabled: true,
            workspaceId: WORKSPACE_1,
          }),
        })

        const response = await webhooksPOST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.webhook.scope).toBe("workspace")

        // Verify INSERT with workspace_id
        expect(sql).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining("INSERT INTO webhook_configs"),
            expect.anything(),
            "org-1",
            WORKSPACE_1, // workspace_id
          ])
        )
      })

      it("should enforce webhook limit per organization", async () => {
        ;(sql as jest.Mock).mockResolvedValue({ rows: [{ count: 10 }] })

        const request = new NextRequest("http://localhost/api/webhooks", {
          method: "POST",
          body: JSON.stringify({
            name: "New Webhook",
            url: "https://example.com/webhook",
            events: ["task.created"],
          }),
        })

        const response = await webhooksPOST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toContain("Maximum webhook limit")
      })
    })

    describe("PATCH /api/webhooks", () => {
      it("should validate workspace access for workspace-specific webhooks", async () => {
        ;(sql as jest.Mock).mockResolvedValueOnce({
          rows: [{ id: "wh-1", secret: "sec-1", workspace_id: WORKSPACE_1 }],
        })
        ;(isAdmin as jest.Mock).mockReturnValue(false)

        // Mock dynamic import
        jest.doMock("@/lib/db/workspaces", () => ({
          userHasWorkspaceAccess: jest.fn().mockResolvedValue(false),
        }))

        const request = new NextRequest("http://localhost/api/webhooks?id=wh-1", {
          method: "PATCH",
          body: JSON.stringify({
            enabled: false,
          }),
        })

        const response = await webhooksPATCH(request)
        const data = await response.json()

        expect(response.status).toBe(403)
      })

      it("should allow updating org-wide webhooks without workspace validation", async () => {
        ;(sql as jest.Mock)
          .mockResolvedValueOnce({
            rows: [{ id: "wh-1", secret: "sec-1", workspace_id: null }],
          })
          .mockResolvedValueOnce({ rows: [] })

        const request = new NextRequest("http://localhost/api/webhooks?id=wh-1", {
          method: "PATCH",
          body: JSON.stringify({
            enabled: false,
          }),
        })

        const response = await webhooksPATCH(request)

        expect(response.status).toBe(200)
        // Should not attempt workspace validation for org-wide webhook
      })
    })

    describe("DELETE /api/webhooks", () => {
      it("should validate workspace access for workspace-specific webhooks", async () => {
        ;(sql as jest.Mock).mockResolvedValueOnce({
          rows: [{ id: "wh-1", name: "Webhook", workspace_id: WORKSPACE_1 }],
        })
        ;(isAdmin as jest.Mock).mockReturnValue(false)

        const request = new NextRequest("http://localhost/api/webhooks?id=wh-1", {
          method: "DELETE",
        })

        const response = await webhooksDELETE(request)
        const data = await response.json()

        expect(response.status).toBe(403)
      })
    })
  })

  describe("Org-wide vs Workspace-specific Visibility", () => {
    it("should show org-wide templates to all workspaces", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
      ;(db.taskTemplates.findByOrganizationId as jest.Mock).mockResolvedValue([
        { id: "t-org", name: "Org Template", workspaceId: null },
        { id: "t-ws1", name: "WS1 Template", workspaceId: WORKSPACE_1 },
        { id: "t-ws2", name: "WS2 Template", workspaceId: WORKSPACE_2 },
      ])

      // Query from workspace-1
      const request1 = new NextRequest(
        `http://localhost/api/task-templates?workspaceId=${WORKSPACE_1}`
      )
      const response1 = await templatesGET(request1)
      const data1 = await response1.json()

      expect(data1.data.some((t: any) => t.id === "t-org")).toBe(true) // Org template visible

      // Query from workspace-2
      const request2 = new NextRequest(
        `http://localhost/api/task-templates?workspaceId=${WORKSPACE_2}`
      )
      const response2 = await templatesGET(request2)
      const data2 = await response2.json()

      expect(data2.data.some((t: any) => t.id === "t-org")).toBe(true) // Same org template visible
    })

    it("should isolate workspace-specific templates", async () => {
      ;(userHasWorkspaceAccess as jest.Mock).mockResolvedValue(true)
      ;(db.taskTemplates.findByOrganizationId as jest.Mock).mockResolvedValue([
        { id: "t-ws1", name: "WS1 Template", workspaceId: WORKSPACE_1 },
        { id: "t-ws2", name: "WS2 Template", workspaceId: WORKSPACE_2 },
      ])

      // Query from workspace-1
      const request1 = new NextRequest(
        `http://localhost/api/task-templates?workspaceId=${WORKSPACE_1}`
      )
      const response1 = await templatesGET(request1)
      const data1 = await response1.json()

      expect(data1.data.some((t: any) => t.id === "t-ws1")).toBe(true)
      expect(data1.data.some((t: any) => t.id === "t-ws2")).toBe(false) // WS2 not visible

      // Query from workspace-2
      const request2 = new NextRequest(
        `http://localhost/api/task-templates?workspaceId=${WORKSPACE_2}`
      )
      const response2 = await templatesGET(request2)
      const data2 = await response2.json()

      expect(data2.data.some((t: any) => t.id === "t-ws1")).toBe(false) // WS1 not visible
      expect(data2.data.some((t: any) => t.id === "t-ws2")).toBe(true)
    })
  })
})
