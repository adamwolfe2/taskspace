import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess, getUserWorkspaceRole } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createMeetingSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { Meeting } from "@/lib/db/meetings"

// GET /api/meetings - List meetings for a workspace
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const status = searchParams.get("status") as Meeting["status"] | null
    const limit = parseInt(searchParams.get("limit") || "20", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const { verifyWorkspaceOrgBoundary } = await import("@/lib/api/middleware")
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const meetingsList = await meetings.list(workspaceId, { status, limit, offset })

    return NextResponse.json<ApiResponse<Meeting[]>>({
      success: true,
      data: meetingsList,
    })
  } catch (error) {
    logger.error({ error }, "Get meetings error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get meetings" },
      { status: 500 }
    )
  }
})

// POST /api/meetings - Create a new meeting (admin/manager only)
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { workspaceId, title, scheduledAt, attendees } = await validateBody(request, createMeetingSchema)

    // Check workspace access and role
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    // Check if user has admin/owner role
    const role = await getUserWorkspaceRole(auth.user.id, workspaceId)
    if (!isAdmin(auth) && role !== "owner") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only workspace owners can create meetings" },
        { status: 403 }
      )
    }

    const meeting = await meetings.create({
      workspaceId,
      title: title?.trim() || "L10 Meeting",
      scheduledAt,
      attendees: attendees || [],
      createdBy: auth.user.id,
    })

    logger.info(`Meeting created: ${meeting.id} in workspace ${workspaceId}`)

    return NextResponse.json<ApiResponse<Meeting>>({
      success: true,
      data: meeting,
      message: "Meeting created successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Create meeting error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create meeting" },
      { status: 500 }
    )
  }
})
