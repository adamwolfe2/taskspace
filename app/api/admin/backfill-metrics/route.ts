import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import type { ApiResponse } from "@/lib/types"

// One-time backfill: set metric_value_today = task count where NULL,
// then upsert weekly_metric_entries from the backfilled data.
// Protected by CRON_SECRET for safety.

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    )
  }

  // Step 1: Backfill metric_value_today from task array length
  const backfillResult = await sql`
    UPDATE eod_reports
    SET metric_value_today = jsonb_array_length(tasks)
    WHERE metric_value_today IS NULL
      AND tasks IS NOT NULL
      AND jsonb_typeof(tasks) = 'array'
      AND jsonb_array_length(tasks) > 0
    RETURNING id, user_id, date, jsonb_array_length(tasks) as task_count
  `

  // Step 2: Upsert weekly_metric_entries for last 30 days
  const upsertResult = await sql`
    INSERT INTO weekly_metric_entries (id, team_member_id, metric_id, week_ending, actual_value, created_at, updated_at)
    SELECT
      'wme_' || gen_random_uuid()::text,
      om.id as team_member_id,
      tmm.id as metric_id,
      (er.date + (5 - EXTRACT(ISODOW FROM er.date)::int) * INTERVAL '1 day')::date as week_ending,
      SUM(er.metric_value_today) as actual_value,
      NOW(),
      NOW()
    FROM eod_reports er
    JOIN organization_members om ON om.user_id = er.user_id AND om.organization_id = er.organization_id
    JOIN team_member_metrics tmm ON tmm.team_member_id = om.id AND tmm.is_active = true
    WHERE er.metric_value_today IS NOT NULL
      AND er.date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY om.id, tmm.id, (er.date + ((5 - EXTRACT(ISODOW FROM er.date)::int) % 7) * INTERVAL '1 day')::date
    ON CONFLICT (team_member_id, week_ending)
    DO UPDATE SET
      actual_value = EXCLUDED.actual_value,
      updated_at = NOW()
    RETURNING team_member_id, week_ending, actual_value
  `

  return NextResponse.json<ApiResponse<{
    backfilledReports: number
    upsertedEntries: number
    entries: Array<{ teamMemberId: string; weekEnding: string; actualValue: number }>
  }>>({
    success: true,
    data: {
      backfilledReports: backfillResult.rowCount ?? 0,
      upsertedEntries: upsertResult.rowCount ?? 0,
      entries: upsertResult.rows.map(r => ({
        teamMemberId: r.team_member_id,
        weekEnding: r.week_ending instanceof Date ? r.week_ending.toISOString().split("T")[0] : String(r.week_ending),
        actualValue: Number(r.actual_value),
      })),
    },
  })
}
