import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { resolveIssueSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { Issue } from "@/lib/db/meetings"

// POST /api/issues/[id]/resolve - Mark an issue as resolved
export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const { resolution, meetingId } = await validateBody(request, resolveIssueSchema)

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

    // Check if already resolved
    if (issue.status === "resolved") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Issue is already resolved" },
        { status: 400 }
      )
    }

    const resolved = await meetings.resolveIssue(id, resolution)

    // If resolved during a meeting, mark it in the meeting_issues table
    if (meetingId) {
      await meetings.markIssueResolvedInMeeting(meetingId, id)
    }

    logger.info(`Issue resolved: ${id}`)

    return NextResponse.json<ApiResponse<Issue | null>>({
      success: true,
      data: resolved,
      message: "Issue resolved successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Resolve issue error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to resolve issue" },
      { status: 500 }
    )
  }
})
