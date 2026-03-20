import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import type { ApiResponse } from "@/lib/types"

// Seed exact weekly scorecard values by member name.

const SEED_VALUES: Record<string, number> = {
  "Adam Wolfe": 5,
  "Sheenam": 6,
  "Saad Ahmad": 399,
  "Ahmad Bukhari": 4,
  "Ivan Naqvi": 2,
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get week ending Friday for this week (Mar 20, 2026)
    const weekEnding = "2026-03-20"

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

        results.push({ name: member_name || name, value, status: "seeded" })
      } catch (err) {
        results.push({ name, value, status: `error: ${err instanceof Error ? err.message : "unknown"}` })
      }
    }

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
    })
  } catch (error) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
