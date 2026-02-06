import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateIssueSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { Issue } from "@/lib/db/meetings"

// GET /api/issues/[id] - Get a single issue
export const GET = withAuth(async (request, auth, context?) => {
  try {
    const { id } = await context!.params
    const issue = await meetings.getIssue(id)

    if (!issue) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Issue not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const { verifyWorkspaceOrgBoundary } = await import("@/lib/api/middleware")
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(issue.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Issue not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, issue.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    return NextResponse.json<ApiResponse<Issue>>({
      success: true,
      data: issue,
    })
  } catch (error) {
    logger.error({ error }, "Get issue error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get issue" },
      { status: 500 }
    )
  }
})

// PATCH /api/issues/[id] - Update an issue
export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    const { id } = await context!.params

    const issue = await meetings.getIssue(id)
    if (!issue) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Issue not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const { verifyWorkspaceOrgBoundary } = await import("@/lib/api/middleware")
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(issue.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Issue not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, issue.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    const { title, description, priority, status, ownerId } = await validateBody(request, updateIssueSchema)
    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description?.trim()
    if (priority !== undefined) updates.priority = priority
    if (status !== undefined) updates.status = status
    if (ownerId !== undefined) updates.owner_id = ownerId

    const updated = await meetings.updateIssue(id, updates)

    return NextResponse.json<ApiResponse<Issue | null>>({
      success: true,
      data: updated,
      message: "Issue updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update issue error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update issue" },
      { status: 500 }
    )
  }
})

// DELETE /api/issues/[id] - Delete (drop) an issue
export const DELETE = withAuth(async (request, auth, context?) => {
  try {
    const { id } = await context!.params
    const issue = await meetings.getIssue(id)

    if (!issue) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Issue not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const { verifyWorkspaceOrgBoundary } = await import("@/lib/api/middleware")
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(issue.workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Issue not found" },
        { status: 404 }
      )
    }

    // Check workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, issue.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied" },
        { status: 403 }
      )
    }

    await meetings.dropIssue(id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Issue dropped successfully",
    })
  } catch (error) {
    logger.error({ error }, "Delete issue error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete issue" },
      { status: 500 }
    )
  }
})
