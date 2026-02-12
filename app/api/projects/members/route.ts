import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { projectMemberSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse, ProjectMember } from "@/lib/types"

// GET /api/projects/members?projectId=xxx
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")

    if (!projectId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project ID is required" },
        { status: 400 }
      )
    }

    // Verify project belongs to user's org
    const project = await db.projects.findById(auth.organization.id, projectId)
    if (!project) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project not found" },
        { status: 404 }
      )
    }

    const members = await db.projects.getMembers(projectId)

    return NextResponse.json<ApiResponse<ProjectMember[]>>({
      success: true,
      data: members,
    })
  } catch (error) {
    logger.error({ error }, "Get project members error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get project members" },
      { status: 500 }
    )
  }
})

// POST /api/projects/members - Add a member to a project
export const POST = withAuth(async (request, auth) => {
  try {
    const { projectId, userId, role } = await validateBody(request, projectMemberSchema)

    // Verify project belongs to user's org
    const project = await db.projects.findById(auth.organization.id, projectId)
    if (!project) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project not found" },
        { status: 404 }
      )
    }

    const member = await db.projects.addMember(projectId, userId, role || "member")

    logger.info(`Member ${userId} added to project ${projectId}`)

    return NextResponse.json<ApiResponse<ProjectMember>>({
      success: true,
      data: member,
      message: "Member added to project",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Add project member error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to add project member" },
      { status: 500 }
    )
  }
})

// PATCH /api/projects/members - Update member role
export const PATCH = withAuth(async (request, auth) => {
  try {
    const { projectId, userId, role } = await validateBody(request, projectMemberSchema)

    // Verify project belongs to user's org
    const project = await db.projects.findById(auth.organization.id, projectId)
    if (!project) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project not found" },
        { status: 404 }
      )
    }

    const updated = await db.projects.updateMemberRole(projectId, userId, role || "member")

    if (!updated) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found in this project" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<ProjectMember>>({
      success: true,
      data: updated,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update project member error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update project member" },
      { status: 500 }
    )
  }
})

// DELETE /api/projects/members?projectId=xxx&userId=xxx
export const DELETE = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get("projectId")
    const userId = searchParams.get("userId")

    if (!projectId || !userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project ID and User ID are required" },
        { status: 400 }
      )
    }

    // Verify project belongs to user's org
    const project = await db.projects.findById(auth.organization.id, projectId)
    if (!project) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Project not found" },
        { status: 404 }
      )
    }

    const removed = await db.projects.removeMember(projectId, userId)

    if (!removed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found in this project" },
        { status: 404 }
      )
    }

    logger.info(`Member ${userId} removed from project ${projectId}`)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Member removed from project",
    })
  } catch (error) {
    logger.error({ error }, "Remove project member error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to remove project member" },
      { status: 500 }
    )
  }
})
