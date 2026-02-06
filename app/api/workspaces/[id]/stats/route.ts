/**
 * Workspace Statistics API Route
 *
 * GET /api/workspaces/[id]/stats - Get counts of tasks, rocks, and EOD reports for a workspace
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { getWorkspaceById, userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface WorkspaceStats {
  activeTasks: number
  rocks: number
  eodReports: number
}

export const GET = withAuth(async (
  request: NextRequest,
  auth,
  context?: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await context!.params

    // Get workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check access (unless admin)
    const hasAccess = isAdmin(auth) || await userHasWorkspaceAccess(auth.user.id, id)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have access to this workspace" },
        { status: 403 }
      )
    }

    // Fetch all three counts in a single query for efficiency
    const { rows } = await sql`
      SELECT
        (SELECT COUNT(*) FROM assigned_tasks WHERE workspace_id = ${id} AND status != 'completed') AS active_tasks,
        (SELECT COUNT(*) FROM rocks WHERE workspace_id = ${id}) AS rocks,
        (SELECT COUNT(*) FROM eod_reports WHERE workspace_id = ${id}) AS eod_reports
    `

    const stats: WorkspaceStats = {
      activeTasks: parseInt(rows[0].active_tasks as string, 10) || 0,
      rocks: parseInt(rows[0].rocks as string, 10) || 0,
      eodReports: parseInt(rows[0].eod_reports as string, 10) || 0,
    }

    return NextResponse.json<ApiResponse<WorkspaceStats>>({
      success: true,
      data: stats,
    })
  } catch (error) {
    logError(logger, "Get workspace stats error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get workspace stats" },
      { status: 500 }
    )
  }
})
