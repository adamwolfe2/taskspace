/**
 * Clients API Tests
 *
 * Tests the /api/clients endpoint for client management
 */

import { NextRequest } from "next/server"

// Mock dependencies
const mockGetAuthContext = jest.fn()
const mockVerifyWorkspaceOrgBoundary = jest.fn()
const mockUserHasWorkspaceAccess = jest.fn()
const mockGetWorkspaceById = jest.fn()
const mockIsWorkspaceFeatureEnabled = jest.fn()
const mockClientsFindByWorkspace = jest.fn()
const mockClientsFindById = jest.fn()
const mockClientsCreate = jest.fn()
const mockClientsUpdate = jest.fn()
const mockClientsDelete = jest.fn()
const mockValidateBody = jest.fn()

jest.mock("@/lib/auth/middleware", () => ({
  getAuthContext: mockGetAuthContext,
}))

jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: any) => handler,
  verifyWorkspaceOrgBoundary: mockVerifyWorkspaceOrgBoundary,
}))

jest.mock("@/lib/db/workspaces", () => ({
  userHasWorkspaceAccess: mockUserHasWorkspaceAccess,
  getWorkspaceById: mockGetWorkspaceById,
}))

jest.mock("@/lib/auth/workspace-features", () => ({
  isWorkspaceFeatureEnabled: mockIsWorkspaceFeatureEnabled,
}))

jest.mock("@/lib/db", () => ({
  db: {
    clients: {
      findByWorkspace: mockClientsFindByWorkspace,
      findById: mockClientsFindById,
      create: mockClientsCreate,
      update: mockClientsUpdate,
      delete: mockClientsDelete,
    },
  },
}))

jest.mock("@/lib/validation/middleware", () => ({
  validateBody: mockValidateBody,
  ValidationError: class ValidationError extends Error {
    statusCode: number
    constructor(message: string, statusCode = 400) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

jest.mock("@/lib/db/sql", () => ({
  sql: jest.fn().mockResolvedValue({ rowCount: 0 }),
}))

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { GET, POST, PATCH, DELETE } from "@/app/api/clients/route"

describe("Clients API", () => {
  const mockAuth = {
    user: { id: "user-1", email: "test@example.com" },
    organization: { id: "org-1", name: "Test Org" },
    member: { id: "member-1", role: "admin" },
    sessionId: "session-1",
    isApiKey: false,
  }

  const mockWorkspace = {
    id: "workspace-1",
    organizationId: "org-1",
    name: "Test Workspace",
  }

  const mockClient = {
    id: "client-1",
    organizationId: "org-1",
    workspaceId: "workspace-1",
    name: "Test Client",
    status: "active",
    createdAt: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsWorkspaceFeatureEnabled.mockReturnValue(true)
  })

  describe("GET /api/clients", () => {
    it("should return clients list for authenticated user's workspace", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsFindByWorkspace.mockResolvedValue([mockClient])

      const request = new NextRequest(
        "http://localhost:3000/api/clients?workspaceId=workspace-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([mockClient])
      expect(mockClientsFindByWorkspace).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        undefined
      )
    })

    it("should filter clients by status when provided", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsFindByWorkspace.mockResolvedValue([mockClient])

      const request = new NextRequest(
        "http://localhost:3000/api/clients?workspaceId=workspace-1&status=active"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockClientsFindByWorkspace).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        "active"
      )
    })

    it("should return 400 when workspaceId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/clients")

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Workspace ID is required")
    })

    it("should return 404 when workspace not found", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/clients?workspaceId=invalid-workspace"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Workspace not found")
    })

    it("should return 403 when user lacks workspace access", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/clients?workspaceId=workspace-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Access denied to this workspace")
    })

    it("should return empty list when clients feature is disabled", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockIsWorkspaceFeatureEnabled.mockReturnValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/clients?workspaceId=workspace-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
    })
  })

  describe("POST /api/clients", () => {
    const validClientData = {
      workspaceId: "workspace-1",
      name: "New Client",
      status: "active",
      contactEmail: "contact@client.com",
    }

    it("should create a new client with valid data", async () => {
      mockValidateBody.mockResolvedValue(validClientData)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsCreate.mockResolvedValue(mockClient)

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockClient)
      expect(data.message).toBe("Client created successfully")
      expect(mockClientsCreate).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        expect.objectContaining({
          name: "New Client",
          status: "active",
          createdBy: "user-1",
        })
      )
    })

    it("should validate required field: name", async () => {
      const { ValidationError } = require("@/lib/validation/middleware")
      mockValidateBody.mockRejectedValue(
        new ValidationError("Client name is required", 400)
      )

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Client name is required")
    })

    it("should validate status enum values", async () => {
      const { ValidationError } = require("@/lib/validation/middleware")
      mockValidateBody.mockRejectedValue(
        new ValidationError("Invalid status value", 400)
      )

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Invalid status value")
    })

    it("should return 404 when workspace not found", async () => {
      mockValidateBody.mockResolvedValue(validClientData)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(false)

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Workspace not found")
    })

    it("should return 403 when user lacks workspace access", async () => {
      mockValidateBody.mockResolvedValue(validClientData)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(false)

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Access denied to this workspace")
    })
  })

  describe("PATCH /api/clients", () => {
    const updateData = {
      id: "client-1",
      name: "Updated Client",
      status: "inactive",
    }

    it("should update a client with valid data", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockClientsFindById.mockResolvedValue(mockClient)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsUpdate.mockResolvedValue({ ...mockClient, ...updateData })

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe("Updated Client")
      expect(mockClientsUpdate).toHaveBeenCalledWith(
        "org-1",
        "client-1",
        expect.objectContaining({
          name: "Updated Client",
          status: "inactive",
        })
      )
    })

    it("should return 404 when client not found", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockClientsFindById.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Client not found")
    })

    it("should return 403 when feature is disabled", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockClientsFindById.mockResolvedValue(mockClient)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockIsWorkspaceFeatureEnabled.mockReturnValue(false)

      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Clients feature is not enabled for this workspace")
    })
  })

  describe("DELETE /api/clients", () => {
    it("should delete a client", async () => {
      mockClientsFindById.mockResolvedValue(mockClient)
      mockClientsDelete.mockResolvedValue(true)

      const request = new NextRequest(
        "http://localhost:3000/api/clients?id=client-1",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("Client deleted successfully")
      expect(mockClientsDelete).toHaveBeenCalledWith("org-1", "client-1")
    })

    it("should return 400 when id is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/clients", {
        method: "DELETE",
      })

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Client ID is required")
    })

    it("should return 404 when client not found", async () => {
      mockClientsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/clients?id=invalid-client",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Client not found")
    })

    it("should return 500 when delete fails", async () => {
      mockClientsFindById.mockResolvedValue(mockClient)
      mockClientsDelete.mockResolvedValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/clients?id=client-1",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to delete client")
    })
  })
})
