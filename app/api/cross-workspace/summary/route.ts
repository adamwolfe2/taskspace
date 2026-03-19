import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface WorkspaceSummary {
  workspaceId: string
  workspaceName: string
  rocksTotal: number
  rocksCompleted: number
  rockCompletionRate: number
  tasksTotal: number
  tasksCompleted: number
  taskCompletionRate: number
  eodCountThisWeek: number
  latestHealthScore: number | null
}

// GET /api/cross-workspace/summary - Summary across all org workspaces
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    // Must be owner or admin
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    // Query all workspaces for the org
    const workspacesResult = await sql`
      SELECT id, name
      FROM workspaces
      WHERE organization_id = ${auth.organization.id}
        AND is_active = true
      ORDER BY name ASC
    `

    if (workspacesResult.rows.length === 0) {
      return NextResponse.json<ApiResponse<WorkspaceSummary[]>>({
        success: true,
        data: [],
      })
    }

    const _workspaceIds = workspacesResult.rows.map(r => r.id as string)

    // Compute week boundaries (Monday to Sunday)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=Sun
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() + diffToMonday)
    weekStart.setHours(0, 0, 0, 0)
    const weekStartStr = weekStart.toISOString().split("T")[0]

    // For each workspace, gather metrics in parallel
    const summaries: WorkspaceSummary[] = await Promise.all(
      workspacesResult.rows.map(async (wsRow) => {
        const wsId = wsRow.id as string
        const wsName = wsRow.name as string

        // Rocks: total and completed
        const rocksResult = await sql`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed
          FROM rocks
          WHERE workspace_id = ${wsId}
            AND org_id = ${auth.organization.id}
        `
        const rocksTotal = parseInt((rocksResult.rows[0]?.total as string) || "0", 10)
        const rocksCompleted = parseInt((rocksResult.rows[0]?.completed as string) || "0", 10)
        const rockCompletionRate = rocksTotal > 0 ? Math.round((rocksCompleted / rocksTotal) * 100) : 0

        // Tasks: total and completed
        const tasksResult = await sql`
          SELECT
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed
          FROM assigned_tasks
          WHERE workspace_id = ${wsId}
            AND org_id = ${auth.organization.id}
        `
        const tasksTotal = parseInt((tasksResult.rows[0]?.total as string) || "0", 10)
        const tasksCompleted = parseInt((tasksResult.rows[0]?.completed as string) || "0", 10)
        const taskCompletionRate = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0

        // EODs this week
        const eodResult = await sql`
          SELECT COUNT(*) AS count
          FROM eod_reports
          WHERE workspace_id = ${wsId}
            AND org_id = ${auth.organization.id}
            AND date::date >= ${weekStartStr}::date
        `
        const eodCountThisWeek = parseInt((eodResult.rows[0]?.count as string) || "0", 10)

        // Latest EOS health score (overall_grade as numeric: A=95, B=80, C=65, D=50, F=35)
        const healthResult = await sql`
          SELECT overall_grade
          FROM eos_health_reports
          WHERE workspace_id = ${wsId}
            AND org_id = ${auth.organization.id}
          ORDER BY created_at DESC
          LIMIT 1
        `
        let latestHealthScore: number | null = null
        if (healthResult.rows.length > 0) {
          const grade = healthResult.rows[0].overall_grade as string
          const gradeMap: Record<string, number> = { A: 95, B: 80, C: 65, D: 50, F: 35 }
          latestHealthScore = gradeMap[grade?.toUpperCase()] ?? null
        }

        return {
          workspaceId: wsId,
          workspaceName: wsName,
          rocksTotal,
          rocksCompleted,
          rockCompletionRate,
          tasksTotal,
          tasksCompleted,
          taskCompletionRate,
          eodCountThisWeek,
          latestHealthScore,
        }
      })
    )

    return NextResponse.json<ApiResponse<WorkspaceSummary[]>>({
      success: true,
      data: summaries,
    })
  } catch (error) {
    logError(logger, "Cross-workspace summary error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get cross-workspace summary" },
      { status: 500 }
    )
  }
})
