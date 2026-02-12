/**
 * Project Members API Tests
 *
 * Tests the /api/projects/members endpoint for project member management
 */

import { NextRequest } from "next/server"

// Mock dependencies
const mockGetAuthContext = jest.fn()
const mockProjectsFindById = jest.fn()
const mockProjectsGetMembers = jest.fn()
const mockProjectsAddMember = jest.fn()
const mockProjectsUpdateMemberRole = jest.fn()
const mockProjectsRemoveMember = jest.fn()
const mockValidateBody = jest.fn()

jest.mock("@/lib/auth/middleware", () => ({
  getAuthContext: mockGetAuthContext,
}))

jest.mock("@/lib/api/middleware", () => ({
  withAuth: (handler: any) => handler,
}))

jest.mock("@/lib/db", () => ({
  db: {
    projects: {
      findById: mockProjectsFindById,
      getMembers: mockProjectsGetMembers,
      addMember: mockProjectsAddMember,
      updateMemberRole: mockProjectsUpdateMemberRole,
      removeMember: mockProjectsRemoveMember,
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

jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

import { GET, POST, PATCH, DELETE } from "@/app/api/projects/members/route"

describe("Project Members API", () => {
  const mockAuth = {
    user: { id: "user-1", email: "test@example.com" },
    organization: { id: "org-1", name: "Test Org" },
    member: { id: "member-1", role: "admin" },
    sessionId: "session-1",
    isApiKey: false,
  }

  const mockProject = {
    id: "project-1",
    organizationId: "org-1",
    workspaceId: "workspace-1",
    name: "Test Project",
    status: "active",
  }

  const mockProjectMember = {
    id: "member-1",
    projectId: "project-1",
    userId: "user-1",
    role: "member",
    joinedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/projects/members", () => {
    it("should return project members", async () => {
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsGetMembers.mockResolvedValue([mockProjectMember])

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=project-1"
      )

      const response = await GET(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([mockProjectMember])
      expect(mockProjectsGetMembers).toHaveBeenCalledWith("project-1")
    })

    it("should return 400 when projectId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/projects/members"
      )

      const response = await GET(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project ID is required")
    })

    it("should return 404 when project not found", async () => {
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=invalid-project"
      )

      const response = await GET(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
    })

    it("should verify project belongs to user's organization", async () => {
      // findById scopes by orgId at the DB level, so a cross-org project returns null
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=project-1"
      )

      const response = await GET(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
      expect(mockProjectsGetMembers).not.toHaveBeenCalled()
    })

    it("should return 500 on database error", async () => {
      mockProjectsFindById.mockRejectedValue(new Error("Database error"))

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=project-1"
      )

      const response = await GET(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Failed to get project members")
    })
  })

  describe("POST /api/projects/members", () => {
    const validMemberData = {
      projectId: "project-1",
      userId: "user-2",
      role: "member",
    }

    it("should add a member to a project", async () => {
      mockValidateBody.mockResolvedValue(validMemberData)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsAddMember.mockResolvedValue(mockProjectMember)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "POST" }
      )

      const response = await POST(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockProjectMember)
      expect(data.message).toBe("Member added to project")
      expect(mockProjectsAddMember).toHaveBeenCalledWith(
        "project-1",
        "user-2",
        "member"
      )
    })

    it("should default to member role when role not provided", async () => {
      const dataWithoutRole = {
        projectId: "project-1",
        userId: "user-2",
      }
      mockValidateBody.mockResolvedValue(dataWithoutRole)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsAddMember.mockResolvedValue(mockProjectMember)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "POST" }
      )

      const response = await POST(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockProjectsAddMember).toHaveBeenCalledWith(
        "project-1",
        "user-2",
        "member"
      )
    })

    it("should validate required fields", async () => {
      const { ValidationError } = require("@/lib/validation/middleware")
      mockValidateBody.mockRejectedValue(
        new ValidationError("Project ID is required", 400)
      )

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "POST" }
      )

      const response = await POST(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project ID is required")
    })

    it("should return 404 when project not found", async () => {
      mockValidateBody.mockResolvedValue(validMemberData)
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "POST" }
      )

      const response = await POST(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
    })

    it("should verify project belongs to user's organization", async () => {
      // findById scopes by orgId at the DB level, so a cross-org project returns null
      mockValidateBody.mockResolvedValue(validMemberData)
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "POST" }
      )

      const response = await POST(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
      expect(mockProjectsAddMember).not.toHaveBeenCalled()
    })
  })

  describe("PATCH /api/projects/members", () => {
    const updateData = {
      projectId: "project-1",
      userId: "user-2",
      role: "lead",
    }

    it("should update member role", async () => {
      const updatedMember = { ...mockProjectMember, role: "lead" }
      mockValidateBody.mockResolvedValue(updateData)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsUpdateMemberRole.mockResolvedValue(updatedMember)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "PATCH" }
      )

      const response = await PATCH(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.role).toBe("lead")
      expect(mockProjectsUpdateMemberRole).toHaveBeenCalledWith(
        "project-1",
        "user-2",
        "lead"
      )
    })

    it("should default to member role when not provided", async () => {
      const dataWithoutRole = {
        projectId: "project-1",
        userId: "user-2",
      }
      const updatedMember = { ...mockProjectMember, role: "member" }
      mockValidateBody.mockResolvedValue(dataWithoutRole)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsUpdateMemberRole.mockResolvedValue(updatedMember)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "PATCH" }
      )

      const response = await PATCH(request, mockAuth)

      expect(response.status).toBe(200)
      expect(mockProjectsUpdateMemberRole).toHaveBeenCalledWith(
        "project-1",
        "user-2",
        "member"
      )
    })

    it("should return 404 when project not found", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "PATCH" }
      )

      const response = await PATCH(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
    })

    it("should return 404 when member not found", async () => {
      mockValidateBody.mockResolvedValue(updateData)
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsUpdateMemberRole.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members",
        { method: "PATCH" }
      )

      const response = await PATCH(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Member not found in this project")
    })
  })

  describe("DELETE /api/projects/members", () => {
    it("should remove a member from a project", async () => {
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsRemoveMember.mockResolvedValue(true)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=project-1&userId=user-2",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe("Member removed from project")
      expect(mockProjectsRemoveMember).toHaveBeenCalledWith("project-1", "user-2")
    })

    it("should return 400 when projectId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?userId=user-2",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project ID and User ID are required")
    })

    it("should return 400 when userId is missing", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=project-1",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project ID and User ID are required")
    })

    it("should return 404 when project not found", async () => {
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=invalid-project&userId=user-2",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
    })

    it("should return 404 when member not found in project", async () => {
      mockProjectsFindById.mockResolvedValue(mockProject)
      mockProjectsRemoveMember.mockResolvedValue(false)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=project-1&userId=user-2",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Member not found in this project")
    })

    it("should verify project belongs to user's organization", async () => {
      // findById scopes by orgId at the DB level, so a cross-org project returns null
      mockProjectsFindById.mockResolvedValue(null)

      const request = new NextRequest(
        "http://localhost:3000/api/projects/members?projectId=project-1&userId=user-2",
        { method: "DELETE" }
      )

      const response = await DELETE(request, mockAuth)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe("Project not found")
      expect(mockProjectsRemoveMember).not.toHaveBeenCalled()
    })
  })
})
