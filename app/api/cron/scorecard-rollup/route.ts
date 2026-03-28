/**
 * GET /api/cron/scorecard-rollup
 *
 * Runs every Friday evening — aggregates metric_value_today from EOD reports
 * into weekly_metric_entries so the Weekly Scorecard always has data.
 *
 * This eliminates the need for manual backfill. Each team member's daily
 * metric values are summed for the Mon-Fri week and stored as the weekly actual.
 */

import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { verifyCronSecret } from "@/lib/api/cron-auth"
import { DEFAULT_TIMEZONE } from "@/lib/utils/date-utils"

function getWeekDatesForTimezone(timezone: string): { weekStart: string; weekEnding: string } {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    const todayStr = formatter.format(now)
    const today = new Date(todayStr + "T12:00:00Z")
    const day = today.getUTCDay()
    // Monday of this week
    const monday = new Date(today)
    monday.setUTCDate(today.getUTCDate() - ((day === 0 ? 7 : day) - 1))
    // Friday of this week
    const friday = new Date(monday)
    friday.setUTCDate(monday.getUTCDate() + 4)
    return {
      weekStart: monday.toISOString().split("T")[0],
      weekEnding: friday.toISOString().split("T")[0],
    }
  } catch {
    // Fallback to UTC
    const now = new Date()
    const day = now.getUTCDay()
    const monday = new Date(now)
    monday.setUTCDate(now.getUTCDate() - ((day === 0 ? 7 : day) - 1))
    const friday = new Date(monday)
    friday.setUTCDate(monday.getUTCDate() + 4)
    return {
      weekStart: monday.toISOString().split("T")[0],
      weekEnding: friday.toISOString().split("T")[0],
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    logger.info("Running weekly scorecard rollup")

    // Get all orgs with active team_member_metrics
    const { rows: orgs } = await sql`
      SELECT DISTINCT o.id, o.name, o.settings
      FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id
      JOIN team_member_metrics tmm ON tmm.team_member_id = om.id AND tmm.is_active = true
      WHERE o.is_internal = false
    `

    const results: Array<{ orgName: string; membersUpdated: number; status: string }> = []

    for (const org of orgs) {
      try {
        const timezone = (org.settings as { timezone?: string })?.timezone || DEFAULT_TIMEZONE
        const { weekStart, weekEnding } = getWeekDatesForTimezone(timezone)

        // Aggregate metric_value_today from EOD reports for each member this week
        // and upsert into weekly_metric_entries
        const { rows: updated } = await sql`
          INSERT INTO weekly_metric_entries (id, team_member_id, metric_id, week_ending, actual_value, created_at, updated_at)
          SELECT
            'wme_' || gen_random_uuid()::text,
            tmm.team_member_id,
            tmm.id,
            ${weekEnding}::date,
            COALESCE(eod_sum.total, 0),
            NOW(),
            NOW()
          FROM team_member_metrics tmm
          JOIN organization_members om ON om.id = tmm.team_member_id
          LEFT JOIN (
            SELECT er.user_id, SUM(er.metric_value_today) as total
            FROM eod_reports er
            WHERE er.organization_id = ${org.id}
              AND er.date >= ${weekStart}
              AND er.date <= ${weekEnding}
              AND er.metric_value_today IS NOT NULL
            GROUP BY er.user_id
          ) eod_sum ON eod_sum.user_id = om.user_id
          WHERE tmm.is_active = true
            AND om.organization_id = ${org.id}
            AND om.status = 'active'
          ON CONFLICT (team_member_id, week_ending)
          DO UPDATE SET
            actual_value = EXCLUDED.actual_value,
            updated_at = NOW()
          RETURNING team_member_id
        `

        results.push({
          orgName: org.name as string,
          membersUpdated: updated.length,
          status: "success",
        })

        logger.info({ orgName: org.name, weekEnding, membersUpdated: updated.length }, "Scorecard rollup complete")
      } catch (err) {
        logError(logger, `Scorecard rollup failed for org ${org.name}`, err)
        results.push({
          orgName: org.name as string,
          membersUpdated: 0,
          status: `error: ${err instanceof Error ? err.message : "unknown"}`,
        })
      }
    }

    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
    })
  } catch (error) {
    logError(logger, "Scorecard rollup cron error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Internal error" },
      { status: 500 }
    )
  }
}
