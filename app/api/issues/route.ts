import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { Issue, IssueStatus } from "@/lib/db/meetings"

// GET /api/issues - List issues for a workspace
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const status = searchParams.get("status") as IssueStatus | null
    const limit = parseInt(searchParams.get("limit") || "50", 10)

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
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

    let issues: Issue[]
    if (status === "open") {
      issues = await meetings.getOpenIssues(workspaceId, limit)
    } else {
      issues = await meetings.listIssues(workspaceId, { status, limit })
    }

    return NextResponse.json<ApiResponse<Issue[]>>({
      success: true,
      data: issues,
    })
  } catch (error) {
    logger.error("Get issues error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get issues" },
      { status: 500 }
    )
  }
}

// POST /api/issues - Create a new issue
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { workspaceId, title, description, priority, ownerId, sourceType, sourceId } = body

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Title is required" },
        { status: 400 }
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

    const issue = await meetings.createIssue({
      workspaceId,
      title: title.trim(),
      description: description?.trim(),
      priority: priority || 0,
      ownerId,
      sourceType,
      sourceId,
      createdBy: auth.user.id,
    })

    logger.info(`Issue created: ${issue.id} in workspace ${workspaceId}`)

    return NextResponse.json<ApiResponse<Issue>>({
      success: true,
      data: issue,
      message: "Issue created successfully",
    })
  } catch (error) {
    logger.error("Create issue error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create issue" },
      { status: 500 }
    )
  }
}
