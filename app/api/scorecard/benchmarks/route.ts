import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, ScorecardBenchmark } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Default benchmark values per metric type
const DEFAULT_BENCHMARKS: Record<string, { value: number; type: string }> = {
  eod_rate: { value: 80, type: "percentage" },
  rock_completion: { value: 75, type: "percentage" },
  l10_rating: { value: 8, type: "rating_out_of_10" },
  task_completion: { value: 70, type: "percentage" },
}

// GET /api/scorecard/benchmarks - Return benchmarks per metric for a workspace
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Get all scorecard metrics for this workspace
    const metricsResult = await sql`
      SELECT id, name, target_value, target_direction, unit
      FROM scorecard_metrics
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
      ORDER BY name ASC
    `

    const now = new Date()
    const benchmarks: ScorecardBenchmark[] = []

    // Compute 13-week rolling average for each metric
    for (const metric of metricsResult.rows) {
      const metricId = metric.id as string
      const metricName = metric.name as string

      // 13-week window
      const thirteenWeeksAgo = new Date(now)
      thirteenWeeksAgo.setDate(thirteenWeeksAgo.getDate() - 91)
      const thirteenWeeksAgoStr = thirteenWeeksAgo.toISOString().split("T")[0]

      const entriesResult = await sql`
        SELECT AVG(value) AS avg_value, COUNT(*) AS weeks_with_data
        FROM scorecard_entries
        WHERE metric_id = ${metricId}
          AND week_start::date >= ${thirteenWeeksAgoStr}::date
          AND value IS NOT NULL
      `

      const avgValue = parseFloat((entriesResult.rows[0]?.avg_value as string) || "0") || 0
      const weeksWithData = parseInt((entriesResult.rows[0]?.weeks_with_data as string) || "0", 10)

      // Use rolling average if we have at least 4 weeks of data, else fall back to target or default
      let benchmarkValue = avgValue
      if (weeksWithData < 4) {
        // Fall back to target_value if set
        const targetValue = metric.target_value != null ? parseFloat(metric.target_value as string) : null
        if (targetValue != null && !isNaN(targetValue)) {
          benchmarkValue = targetValue
        } else {
          // Check for a keyword match in defaults
          const nameLower = metricName.toLowerCase()
          if (nameLower.includes("eod") || nameLower.includes("end of day")) {
            benchmarkValue = DEFAULT_BENCHMARKS.eod_rate.value
          } else if (nameLower.includes("rock") || nameLower.includes("quarterly")) {
            benchmarkValue = DEFAULT_BENCHMARKS.rock_completion.value
          } else if (nameLower.includes("l10") || nameLower.includes("meeting") || nameLower.includes("rating")) {
            benchmarkValue = DEFAULT_BENCHMARKS.l10_rating.value
          } else if (nameLower.includes("task") || nameLower.includes("completion")) {
            benchmarkValue = DEFAULT_BENCHMARKS.task_completion.value
          } else {
            benchmarkValue = 0
          }
        }
      }

      const benchmark: ScorecardBenchmark = {
        id: `bench_${metricId}`,
        orgId: auth.organization.id,
        workspaceId,
        metricName,
        benchmarkValue: Math.round(benchmarkValue * 10) / 10,
        benchmarkType: (metric.unit as string) || "number",
        period: "13-week-rolling",
        computedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }

      benchmarks.push(benchmark)
    }

    // Append hardcoded default benchmarks if not already covered by a metric
    const existingNames = new Set(benchmarks.map(b => b.metricName.toLowerCase()))

    const hardcodedDefaults = [
      { name: "EOD Completion Rate", key: "eod_rate", unit: "percentage" },
      { name: "Rock Completion Rate", key: "rock_completion", unit: "percentage" },
      { name: "L10 Meeting Rating", key: "l10_rating", unit: "rating_out_of_10" },
      { name: "Task Completion Rate", key: "task_completion", unit: "percentage" },
    ]

    for (const defaultBenchmark of hardcodedDefaults) {
      if (!existingNames.has(defaultBenchmark.name.toLowerCase())) {
        const def = DEFAULT_BENCHMARKS[defaultBenchmark.key]
        benchmarks.push({
          id: `bench_default_${defaultBenchmark.key}`,
          orgId: auth.organization.id,
          workspaceId,
          metricName: defaultBenchmark.name,
          benchmarkValue: def.value,
          benchmarkType: defaultBenchmark.unit,
          period: "default",
          computedAt: now.toISOString(),
          createdAt: now.toISOString(),
        })
      }
    }

    return NextResponse.json<ApiResponse<ScorecardBenchmark[]>>({
      success: true,
      data: benchmarks,
    })
  } catch (error) {
    logError(logger, "Scorecard benchmarks error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to compute scorecard benchmarks" },
      { status: 500 }
    )
  }
})
