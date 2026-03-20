import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import type { ApiResponse } from "@/lib/types"

// Admin endpoint to hard-reset all metric data.
// Clears ALL metric_value_today and ALL weekly_metric_entries.

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Hard reset: clear ALL metric_value_today
    const resetResult = await sql`
      UPDATE eod_reports
      SET metric_value_today = NULL
      WHERE metric_value_today IS NOT NULL
    `

    // Hard reset: delete ALL weekly_metric_entries
    const deleteResult = await sql`
      DELETE FROM weekly_metric_entries
    `

    return NextResponse.json<ApiResponse<{
      reportsReset: number
      entriesDeleted: number
    }>>({
      success: true,
      data: {
        reportsReset: resetResult.rowCount ?? 0,
        entriesDeleted: deleteResult.rowCount ?? 0,
      },
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
