import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { Issue } from "@/lib/db/meetings"

// POST /api/issues/[id]/resolve - Mark an issue as resolved
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { resolution, meetingId } = body

    const issue = await meetings.getIssue(id)

    if (!issue) {
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
    logger.error("Resolve issue error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to resolve issue" },
      { status: 500 }
    )
  }
}
