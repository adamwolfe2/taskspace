import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { meetings } from "@/lib/db/meetings"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createIssueSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { Issue, IssueStatus } from "@/lib/db/meetings"
import { parsePaginationParams, buildPaginatedResponse } from "@/lib/utils/pagination"
import type { PaginatedResponse } from "@/lib/utils/pagination"

// GET /api/issues - List issues for a workspace
export const GET = withAuth(async (request, auth) => {
  try {
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

    // Check if cursor-based pagination is requested
    const cursor = searchParams.get("cursor")
    const usePagination = cursor !== null

    if (usePagination) {
      const pagination = parsePaginationParams(searchParams)
      const { issues, totalCount } = await meetings.listIssuesPaginated(
        workspaceId,
        pagination,
        { status }
      )

      const response = buildPaginatedResponse(
        issues,
        pagination.limit,
        totalCount,
        (i) => i.createdAt,
        (i) => i.id
      )

      return NextResponse.json<ApiResponse<PaginatedResponse<Issue>>>({
        success: true,
        data: response,
      })
    }

    // Legacy non-paginated path (backward compatible)
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
    logger.error({ error }, "Get issues error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get issues" },
      { status: 500 }
    )
  }
})

// POST /api/issues - Create a new issue
export const POST = withAuth(async (request, auth) => {
  try {
    const { workspaceId, title, description, priority, ownerId, sourceType, sourceId } =
      await validateBody(request, createIssueSchema)

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

    const issue = await meetings.createIssue({
      workspaceId,
      title,
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
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Create issue error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create issue" },
      { status: 500 }
    )
  }
})
