import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import type { ApiResponse } from "@/lib/types"

// Current week's actual values by team member name
const SEED_VALUES: Record<string, number> = {
  "Adam Wolfe": 4,
  "Sheenam": 6,
  "Saad Ahmad": 399,
  "Ahmad Bukhari": 4,
  "Ivan Naqvi": 2,
}

function getCurrentWeekDates(): { weekStart: string; weekEnding: string } {
  const now = new Date()
  const day = now.getDay()
  // Monday of this week
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day === 0 ? 7 : day) - 1))
  // Friday of this week
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return {
    weekStart: monday.toISOString().split("T")[0],
    weekEnding: friday.toISOString().split("T")[0],
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { weekStart, weekEnding } = getCurrentWeekDates()
    const results: Array<{ name: string; value: number; status: string }> = []

    for (const [name, value] of Object.entries(SEED_VALUES)) {
      try {
        // Look up member and their active metric by name
        const { rows } = await sql`
          SELECT om.id as member_id, tmm.id as metric_id,
                 COALESCE(NULLIF(om.name, ''), u.name) as member_name
          FROM organization_members om
          JOIN team_member_metrics tmm ON tmm.team_member_id = om.id AND tmm.is_active = true
          LEFT JOIN users u ON u.id = om.user_id
          WHERE (om.name ILIKE ${name + '%'} OR u.name ILIKE ${name + '%'})
          LIMIT 1
        `

        if (rows.length === 0) {
          results.push({ name, value, status: "not_found" })
          continue
        }

        const { member_id, metric_id, member_name } = rows[0]

        // Upsert into weekly_metric_entries (legacy table — used by legacy scorecard path)
        await sql`
          INSERT INTO weekly_metric_entries (id, team_member_id, metric_id, week_ending, actual_value, created_at, updated_at)
          VALUES (
            'wme_' || gen_random_uuid()::text,
            ${member_id},
            ${metric_id},
            ${weekEnding}::date,
            ${value},
            NOW(),
            NOW()
          )
          ON CONFLICT (team_member_id, week_ending)
          DO UPDATE SET
            actual_value = ${value},
            updated_at = NOW()
        `

        // Also try to upsert into scorecard_entries (new table — used by new scorecard path)
        // Find matching scorecard_metrics entry if it exists
        const { rows: newMetricRows } = await sql`
          SELECT sm.id as scorecard_metric_id
          FROM scorecard_metrics sm
          JOIN organization_members om ON om.user_id = sm.owner_id
          WHERE (om.name ILIKE ${name + '%'} OR om.id = ${member_id})
            AND sm.is_active = true
          LIMIT 1
        `

        if (newMetricRows.length > 0) {
          await sql`
            INSERT INTO scorecard_entries (id, metric_id, value, week_start, entered_by, status, created_at, updated_at)
            VALUES (
              'se_' || gen_random_uuid()::text,
              ${newMetricRows[0].scorecard_metric_id},
              ${value},
              ${weekStart}::date,
              ${member_id},
              CASE WHEN ${value} >= 0 THEN 'green' ELSE 'red' END,
              NOW(),
              NOW()
            )
            ON CONFLICT (metric_id, week_start)
            DO UPDATE SET
              value = ${value},
              updated_at = NOW()
          `
        }

        results.push({ name: member_name || name, value, status: "seeded" })
      } catch (err) {
        results.push({ name, value, status: `error: ${err instanceof Error ? err.message : "unknown"}` })
      }
    }

    return NextResponse.json<ApiResponse<{ weekStart: string; weekEnding: string; results: typeof results }>>({
      success: true,
      data: { weekStart, weekEnding, results },
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
