/**
 * Projects API Tests
 *
 * Tests the /api/projects endpoint for project management
 */

import { NextRequest } from "next/server"

// Mock dependencies
const mockGetAuthContext = jest.fn()
const mockVerifyWorkspaceOrgBoundary = jest.fn()
const mockUserHasWorkspaceAccess = jest.fn()
const mockGetWorkspaceById = jest.fn()
const mockIsWorkspaceFeatureEnabled = jest.fn()
const mockProjectsFindByWorkspace = jest.fn()
const mockProjectsFindById = jest.fn()
const mockProjectsCreate = jest.fn()
const mockProjectsUpdate = jest.fn()
const mockProjectsDelete = jest.fn()
const mockProjectsAddMember = jest.fn()
const mockClientsFindById = jest.fn()
const mockValidateBody = jest.fn()

jest.mock("@/lib/auth/middleware", () => ({
  getAuthContext: mockGetAuthContext,
  isAdmin: (ctx: { member: { role: string } }) =>
    ctx.member.role === "owner" || ctx.member.role === "admin",
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
    projects: {
      findByWorkspace: mockProjectsFindByWorkspace,
      findById: mockProjectsFindById,
      create: mockProjectsCreate,
      update: mockProjectsUpdate,
      delete: mockProjectsDelete,
      addMember: mockProjectsAddMember,
    },
    clients: {
      findById: mockClientsFindById,
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

import { GET, POST, PATCH, DELETE } from "@/app/api/projects/route"

describe("Projects API", () => {
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

  const mockProject = {
    id: "project-1",
    organizationId: "org-1",
    workspaceId: "workspace-1",
    name: "Test Project",
    status: "active",
    priority: "normal",
    createdAt: new Date().toISOString(),
  }

  const mockClient = {
    id: "client-1",
    organizationId: "org-1",
    workspaceId: "workspace-1",
    name: "Test Client",
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockIsWorkspaceFeatureEnabled.mockReturnValue(true)
  })

  describe("GET /api/projects", () => {
    it("should return projects list for authenticated user's workspace", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockProjectsFindByWorkspace.mockResolvedValue([mockProject])

      const request = new NextRequest(
        "http://localhost:3000/api/projects?workspaceId=workspace-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([mockProject])
      expect(mockProjectsFindByWorkspace).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        expect.objectContaining({
          status: undefined,
          clientId: undefined,
          ownerId: undefined,
        })
      )
    })

    it("should filter projects by clientId query param", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockProjectsFindByWorkspace.mockResolvedValue([mockProject])

      const request = new NextRequest(
        "http://localhost:3000/api/projects?workspaceId=workspace-1&clientId=client-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockProjectsFindByWorkspace).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        expect.objectContaining({
          clientId: "client-1",
        })
      )
    })

    it("should filter projects by status query param", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockProjectsFindByWorkspace.mockResolvedValue([mockProject])

      const request = new NextRequest(
        "http://localhost:3000/api/projects?workspaceId=workspace-1&status=active"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockProjectsFindByWorkspace).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        expect.objectContaining({
          status: "active",
        })
      )
    })

    it("should filter projects by ownerId query param", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockProjectsFindByWorkspace.mockResolvedValue([mockProject])

      const request = new NextRequest(
        "http://localhost:3000/api/projects?workspaceId=workspace-1&ownerId=user-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockProjectsFindByWorkspace).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        expect.objectContaining({
          ownerId: "user-1",
        })
      )
    })

    it("should return 400 when workspaceId is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects")

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Workspace ID is required")
    })

    it("should return 404 when workspace not found", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/projects?workspaceId=invalid-workspace"
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
        "http://localhost:3000/api/projects?workspaceId=workspace-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Access denied to this workspace")
    })

    it("should return 403 when projects feature is disabled", async () => {
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockIsWorkspaceFeatureEnabled.mockReturnValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/projects?workspaceId=workspace-1"
      )

      const response = await GET(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Projects feature is not enabled for this workspace")
    })
  })

  describe("POST /api/projects", () => {
    const validProjectData = {
      workspaceId: "workspace-1",
      name: "New Project",
      status: "active",
      priority: "high",
      description: "Test project description",
    }

    it("should create a new project with valid data", async () => {
      mockValidateBody.mockResolvedValue(validProjectData)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockProjectsCreate.mockResolvedValue(mockProject)
      mockProjectsAddMember.mockResolvedValue({})

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockProject)
      expect(data.message).toBe("Project created successfully")
      expect(mockProjectsCreate).toHaveBeenCalledWith(
        "org-1",
        "workspace-1",
        expect.objectContaining({
          name: "New Project",
          status: "active",
          priority: "high",
          createdBy: "user-1",
        })
      )
      expect(mockProjectsAddMember).toHaveBeenCalledWith(
        mockProject.id,
        "user-1",
        "owner"
      )
    })

    it("should validate required fields", async () => {
      const { ValidationError } = require("@/lib/validation/middleware")
      mockValidateBody.mockRejectedValue(
        new ValidationError("Project name is required", 400)
      )

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project name is required")
    })

    it("should validate client belongs to workspace when clientId is provided", async () => {
      const projectDataWithClient = {
        ...validProjectData,
        clientId: "client-1",
      }
      mockValidateBody.mockResolvedValue(projectDataWithClient)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsFindById.mockResolvedValue(mockClient)
      mockProjectsCreate.mockResolvedValue(mockProject)
      mockProjectsAddMember.mockResolvedValue({})

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockClientsFindById).toHaveBeenCalledWith("org-1", "client-1")
    })

    it("should return 400 when client not found in workspace", async () => {
      const projectDataWithClient = {
        ...validProjectData,
        clientId: "client-1",
      }
      mockValidateBody.mockResolvedValue(projectDataWithClient)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsFindById.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Client not found in this workspace")
    })

    it("should return 400 when client workspace mismatch", async () => {
      const projectDataWithClient = {
        ...validProjectData,
        clientId: "client-1",
      }
      mockValidateBody.mockResolvedValue(projectDataWithClient)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(true)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsFindById.mockResolvedValue({
        ...mockClient,
        workspaceId: "different-workspace",
      })

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Client not found in this workspace")
    })

    it("should return 404 when workspace not found", async () => {
      mockValidateBody.mockResolvedValue(validProjectData)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(false)

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Workspace not found")
    })

    it("should return 403 when user lacks workspace access", async () => {
      mockValidateBody.mockResolvedValue(validProjectData)
      mockVerifyWorkspaceOrgBoundary.mockResolvedValue(true)
      mockUserHasWorkspaceAccess.mockResolvedValue(false)

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "POST",
      })

      const response = await POST(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Access denied to this workspace")
    })
  })

  describe("PATCH /api/projects", () => {
    const updateData = {
      id: "project-1",
      name: "Updated Project",
      status: "completed",
    }

    it("should update a project with valid data", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockProjectsUpdate.mockResolvedValue({ ...mockProject, ...updateData })

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe("Updated Project")
      expect(mockProjectsUpdate).toHaveBeenCalledWith(
        "org-1",
        "project-1",
        expect.objectContaining({
          name: "Updated Project",
          status: "completed",
        })
      )
    })

    it("should return 404 when project not found", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
    })

    it("should validate client when updating clientId", async () => {
      const updateWithClient = {
        ...updateData,
        clientId: "client-1",
      }
      mockValidateBody.mockResolvedValue(updateWithClient)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsFindById.mockResolvedValue(mockClient)
      mockProjectsUpdate.mockResolvedValue({ ...mockProject, ...updateWithClient })

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      await response.json()

      expect(response.status).toBe(200)
      expect(mockClientsFindById).toHaveBeenCalledWith("org-1", "client-1")
    })

    it("should return 400 when updating with invalid client", async () => {
      const updateWithClient = {
        ...updateData,
        clientId: "client-1",
      }
      mockValidateBody.mockResolvedValue(updateWithClient)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockClientsFindById.mockResolvedValue({
        ...mockClient,
        workspaceId: "different-workspace",
      })

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Client not found in this workspace")
    })

    it("should return 403 when feature is disabled", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockGetWorkspaceById.mockResolvedValue(mockWorkspace)
      mockIsWorkspaceFeatureEnabled.mockReturnValue(false)

      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "PATCH",
      })

      const response = await PATCH(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Projects feature is not enabled for this workspace")
    })
  })

  describe("DELETE /api/projects", () => {
    it("should delete a project", async () => {
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsDelete.mockResolvedValue(true)

      const request = new NextRequest(
        "http://localhost:3000/api/projects?id=project-1",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("Project deleted successfully")
      expect(mockProjectsDelete).toHaveBeenCalledWith("org-1", "project-1")
    })

    it("should return 400 when id is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/projects", {
        method: "DELETE",
      })

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project ID is required")
    })

    it("should return 404 when project not found", async () => {
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects?id=invalid-project",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
    })

    it("should return 500 when delete fails", async () => {
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsDelete.mockResolvedValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/projects?id=project-1",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to delete project")
    })

    it("should return 403 when non-owner/non-admin tries to delete another user's project", async () => {
      // Project owned by someone else, requester is a regular member
      mockProjectsFindById.mockResolvedValue({ ...mockProject, ownerId: "other-user", createdBy: "other-user" })

      const memberAuth = { ...mockAuth, member: { id: "member-1", role: "member" } }
      const request = new NextRequest(
        "http://localhost:3000/api/projects?id=project-1",
        { method: "DELETE" }
      )

      const response = await DELETE(request, memberAuth as any)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Only project owners and admins can delete projects")
    })
  })
})
