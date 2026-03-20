import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import type { ApiResponse } from "@/lib/types"

// Admin endpoint to reset metric data that was incorrectly backfilled
// from task counts. Clears metric_value_today and weekly_metric_entries
// so the scorecard starts fresh from actual user input.
// Protected by CRON_SECRET for safety.

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Step 1: Reset metric_value_today back to NULL on all reports
    // where it was set to the task array length (bad backfill)
    const resetResult = await sql`
      UPDATE eod_reports
      SET metric_value_today = NULL
      WHERE metric_value_today IS NOT NULL
        AND metric_value_today = jsonb_array_length(tasks)
        AND tasks IS NOT NULL
        AND jsonb_typeof(tasks) = 'array'
    `

    // Step 2: Delete all weekly_metric_entries (they were populated from bad data)
    const deleteResult = await sql`
      DELETE FROM weekly_metric_entries
      WHERE created_at >= NOW() - INTERVAL '1 day'
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
      message: "Metric data reset. Scorecard will now show values from actual user input only.",
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
