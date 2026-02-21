import { NextRequest, NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export interface Activity {
  id: string
  type: "task_completed" | "eod_submitted" | "rock_updated"
  description: string
  actorName: string
  occurredAt: string
}

// GET /api/activity - Get recent activity for workspace
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // SECURITY: workspaceId is required to prevent data leakage across workspaces
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Query recent activities from multiple sources using UNION ALL
    const result = await sql<{
      id: string
      type: string
      description: string
      actor_name: string
      occurred_at: string
    }>`
      SELECT
        t.id,
        'task_completed' as type,
        t.title as description,
        t.assignee_name as actor_name,
        t.completed_at as occurred_at
      FROM assigned_tasks t
      WHERE t.workspace_id = ${workspaceId}
        AND t.organization_id = ${auth.organization.id}
        AND t.status = 'completed'
        AND t.completed_at IS NOT NULL
        AND t.completed_at >= NOW() - INTERVAL '7 days'

      UNION ALL

      SELECT
        e.id,
        'eod_submitted' as type,
        '' as description,
        om.name as actor_name,
        e.submitted_at as occurred_at
      FROM eod_reports e
      JOIN organization_members om ON om.user_id = e.user_id AND om.organization_id = e.organization_id
      WHERE e.workspace_id = ${workspaceId}
        AND e.organization_id = ${auth.organization.id}
        AND e.submitted_at >= NOW() - INTERVAL '7 days'

      UNION ALL

      SELECT
        r.id,
        'rock_updated' as type,
        r.title as description,
        om.name as actor_name,
        r.updated_at as occurred_at
      FROM rocks r
      JOIN organization_members om ON om.user_id = r.user_id AND om.organization_id = r.organization_id
      WHERE r.workspace_id = ${workspaceId}
        AND r.organization_id = ${auth.organization.id}
        AND r.updated_at >= NOW() - INTERVAL '7 days'
        AND r.updated_at > r.created_at

      ORDER BY occurred_at DESC
      LIMIT 15
    `

    // Transform to camelCase for frontend
    const activities: Activity[] = result.rows.map((row) => ({
      id: row.id,
      type: row.type as Activity["type"],
      description: row.description,
      actorName: row.actor_name,
      occurredAt: row.occurred_at,
    }))

    return NextResponse.json<ApiResponse<Activity[]>>({
      success: true,
      data: activities,
    })
  } catch (error) {
    logError(logger, "Get activity error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get activity" },
      { status: 500 }
    )
  }
})
