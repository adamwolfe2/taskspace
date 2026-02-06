import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { workspaceNotes } from "@/lib/db/workspace-notes"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { upsertWorkspaceNoteSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse, WorkspaceNote } from "@/lib/types"

// GET /api/workspace-notes?workspaceId=xxx
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const note = await workspaceNotes.get(workspaceId)

    return NextResponse.json<ApiResponse<WorkspaceNote | null>>({
      success: true,
      data: note,
    })
  } catch (error) {
    logger.error({ error }, "Get workspace note error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get workspace note" },
      { status: 500 }
    )
  }
})

// PUT /api/workspace-notes - Upsert note content
export const PUT = withAuth(async (request, auth) => {
  try {
    const { workspaceId, content } = await validateBody(request, upsertWorkspaceNoteSchema)

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const note = await workspaceNotes.upsert(workspaceId, content, auth.user.id)

    return NextResponse.json<ApiResponse<WorkspaceNote>>({
      success: true,
      data: note,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Upsert workspace note error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to save workspace note" },
      { status: 500 }
    )
  }
})
