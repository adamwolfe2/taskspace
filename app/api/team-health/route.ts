import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse, TeamHealthSnapshot } from "@/lib/types"
import { sql } from "@/lib/db/sql"

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const weeks = parseInt(searchParams.get("weeks") || "13", 10)

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT id, org_id, workspace_id, week_start, overall_score, dimensions, computed_at, created_at
      FROM team_health_snapshots
      WHERE workspace_id = ${workspaceId} AND org_id = ${auth.organization.id}
      ORDER BY week_start DESC
      LIMIT ${weeks}
    `

    const snapshots: TeamHealthSnapshot[] = result.rows.map(row => ({
      id: row.id as string,
      orgId: row.org_id as string,
      workspaceId: row.workspace_id as string,
      weekStart: (row.week_start as Date)?.toISOString().split("T")[0] || "",
      overallScore: row.overall_score as number,
      dimensions: row.dimensions as TeamHealthSnapshot["dimensions"],
      computedAt: (row.computed_at as Date)?.toISOString() || "",
      createdAt: (row.created_at as Date)?.toISOString() || "",
    }))

    return NextResponse.json<ApiResponse<TeamHealthSnapshot[]>>({
      success: true,
      data: snapshots,
    })
  } catch {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch team health data" },
      { status: 500 }
    )
  }
})
