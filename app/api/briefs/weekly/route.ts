import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse, WeeklyBriefRecord } from "@/lib/types"
import { sql } from "@/lib/db/sql"

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || auth.user.id

    const result = await sql`
      SELECT id, org_id, user_id, week_start, content, created_at
      FROM weekly_briefs
      WHERE org_id = ${auth.organization.id} AND user_id = ${userId}
      ORDER BY week_start DESC
      LIMIT 1
    `

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: true,
        data: null,
      })
    }

    const row = result.rows[0]
    const brief: WeeklyBriefRecord = {
      id: row.id as string,
      orgId: row.org_id as string,
      userId: row.user_id as string,
      weekStart: (row.week_start as Date)?.toISOString().split("T")[0] || "",
      content: row.content as WeeklyBriefRecord["content"],
      createdAt: (row.created_at as Date)?.toISOString() || "",
    }

    return NextResponse.json<ApiResponse<WeeklyBriefRecord>>({
      success: true,
      data: brief,
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch weekly brief" },
      { status: 500 }
    )
  }
})
