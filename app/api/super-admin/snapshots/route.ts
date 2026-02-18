import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface SnapshotData {
  organizationId: string
  organizationName: string
  snapshotDate: string
  memberCount: number
  eodSubmissionCount: number
  eodSubmissionRate: number
  activeTaskCount: number
  completedTaskCount: number
  openEscalationCount: number
  avgRockProgress: number
  rocksOnTrack: number
  rocksAtRisk: number
  rocksBlocked: number
  rocksCompleted: number
}

// GET /api/super-admin/snapshots?days=30&orgId=optional
export const GET = withSuperAdmin(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10), 90)
    const orgId = searchParams.get("orgId")

    let rows
    if (orgId) {
      const result = await sql`
        SELECT ps.*, o.name as org_name
        FROM portfolio_snapshots ps
        JOIN organizations o ON ps.organization_id = o.id
        WHERE ps.organization_id = ${orgId}
          AND ps.snapshot_date >= NOW() - ${days + ' days'}::interval
        ORDER BY ps.snapshot_date DESC
      `
      rows = result.rows
    } else {
      const result = await sql`
        SELECT ps.*, o.name as org_name
        FROM portfolio_snapshots ps
        JOIN organizations o ON ps.organization_id = o.id
        WHERE ps.snapshot_date >= NOW() - ${days + ' days'}::interval
        ORDER BY ps.snapshot_date DESC, o.name ASC
      `
      rows = result.rows
    }

    const snapshots: SnapshotData[] = rows.map(row => ({
      organizationId: row.organization_id as string,
      organizationName: row.org_name as string,
      snapshotDate: (row.snapshot_date as Date).toISOString().split("T")[0],
      memberCount: row.member_count as number,
      eodSubmissionCount: row.eod_submission_count as number,
      eodSubmissionRate: parseFloat(row.eod_submission_rate as string || "0"),
      activeTaskCount: row.active_task_count as number,
      completedTaskCount: row.completed_task_count as number,
      openEscalationCount: row.open_escalation_count as number,
      avgRockProgress: parseFloat(row.avg_rock_progress as string || "0"),
      rocksOnTrack: row.rocks_on_track as number,
      rocksAtRisk: row.rocks_at_risk as number,
      rocksBlocked: row.rocks_blocked as number,
      rocksCompleted: row.rocks_completed as number,
    }))

    return NextResponse.json<ApiResponse<{ snapshots: SnapshotData[]; days: number }>>({
      success: true,
      data: { snapshots, days },
    })
  } catch (error) {
    logError(logger, "Get portfolio snapshots error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get portfolio snapshots" },
      { status: 500 }
    )
  }
})
