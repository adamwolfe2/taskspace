import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { generateEOSHealthReport } from "@/lib/ai/claude-client"
import { generateId } from "@/lib/auth/password"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, EOSHealthReport } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

function rowToEOSHealthReport(row: Record<string, unknown>): EOSHealthReport {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    workspaceId: row.workspace_id as string,
    quarter: row.quarter as string,
    scores: (row.scores as EOSHealthReport["scores"]) || {
      vision: 0, people: 0, data: 0, issues: 0, process: 0, traction: 0,
    },
    overallGrade: (row.overall_grade as string) || "C",
    aiAnalysis: (row.ai_analysis as string) || "",
    recommendations: (row.recommendations as string[]) || [],
    createdBy: (row.created_by as string) || undefined,
    createdAt: (row.created_at as Date)?.toISOString() || new Date().toISOString(),
  }
}

// GET /api/eos-health - List EOS health reports for a workspace
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const result = await sql`
      SELECT * FROM eos_health_reports
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
      ORDER BY created_at DESC
      LIMIT 10
    `

    const reports: EOSHealthReport[] = result.rows.map(row =>
      rowToEOSHealthReport(row as Record<string, unknown>)
    )

    return NextResponse.json<ApiResponse<EOSHealthReport[]>>({
      success: true,
      data: reports,
    })
  } catch (error) {
    logError(logger, "List EOS health reports error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to list EOS health reports" },
      { status: 500 }
    )
  }
})

// POST /api/eos-health - Generate a new EOS health report
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { workspaceId, quarter } = body

    if (!workspaceId || !quarter) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId and quarter are required" },
        { status: 400 }
      )
    }

    // Credit check
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) return creditCheck as NextResponse<ApiResponse<null>>

    // Gather V/TO data
    const vtoResult = await sql`
      SELECT * FROM vto WHERE workspace_id = ${workspaceId} AND org_id = ${auth.organization.id}
      LIMIT 1
    `
    const vtoData = vtoResult.rows[0] || {}

    // Gather org chart summary (member count by department)
    const orgChartResult = await sql`
      SELECT department, COUNT(*) AS count
      FROM organization_members
      WHERE organization_id = ${auth.organization.id}
        AND status = 'active'
      GROUP BY department
    `
    const orgChart = {
      departments: orgChartResult.rows.map(r => ({
        name: r.department as string,
        count: parseInt(r.count as string, 10),
      })),
    }

    // Gather scorecard metrics summary
    const scorecardResult = await sql`
      SELECT
        COUNT(*) AS total_metrics,
        COUNT(*) FILTER (WHERE sm.target_direction = 'above' AND se.value >= sm.target_value) AS on_target,
        COUNT(*) FILTER (WHERE sm.target_direction = 'below' AND se.value <= sm.target_value) AS on_target_below
      FROM scorecard_metrics sm
      LEFT JOIN scorecard_entries se
        ON se.metric_id = sm.id
        AND se.week_start::date >= (NOW() - INTERVAL '4 weeks')::date
      WHERE sm.workspace_id = ${workspaceId}
        AND sm.org_id = ${auth.organization.id}
    `
    const scorecardMetrics = scorecardResult.rows[0] || {}

    // IDS issues summary
    const idsResult = await sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved,
        COUNT(*) FILTER (WHERE status = 'open' OR status = 'in_progress') AS open
      FROM issues
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
    `
    const idsIssues = {
      total: parseInt((idsResult.rows[0]?.total as string) || "0", 10),
      resolved: parseInt((idsResult.rows[0]?.resolved as string) || "0", 10),
      open: parseInt((idsResult.rows[0]?.open as string) || "0", 10),
    }

    // Rocks summary
    const rocksResult = await sql`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'on-track') AS on_track
      FROM rocks
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND quarter = ${quarter}
    `
    const rocks = {
      total: parseInt((rocksResult.rows[0]?.total as string) || "0", 10),
      completed: parseInt((rocksResult.rows[0]?.completed as string) || "0", 10),
      onTrack: parseInt((rocksResult.rows[0]?.on_track as string) || "0", 10),
    }

    // Meetings summary
    const meetingsResult = await sql`
      SELECT
        COUNT(*) AS total,
        AVG(rating) AS avg_rating
      FROM meetings
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
        AND created_at >= NOW() - INTERVAL '90 days'
    `
    const meetings = {
      total: parseInt((meetingsResult.rows[0]?.total as string) || "0", 10),
      avgRating: parseFloat((meetingsResult.rows[0]?.avg_rating as string) || "0") || undefined,
    }

    // EOD reports summary
    const eodResult = await sql`
      SELECT
        COUNT(DISTINCT user_id) AS total_members,
        COUNT(DISTINCT user_id) FILTER (
          WHERE created_at >= NOW() - INTERVAL '30 days'
        ) AS active_members
      FROM eod_reports
      WHERE workspace_id = ${workspaceId}
        AND org_id = ${auth.organization.id}
    `
    const totalMembersResult = await sql`
      SELECT COUNT(*) AS count
      FROM workspace_members
      WHERE workspace_id = ${workspaceId}
    `
    const totalMembers = parseInt((totalMembersResult.rows[0]?.count as string) || "1", 10)
    const activeEodMembers = parseInt((eodResult.rows[0]?.active_members as string) || "0", 10)
    const eodReports = {
      totalMembers,
      avgCompletionRate: totalMembers > 0 ? Math.round((activeEodMembers / totalMembers) * 100) : 0,
    }

    // Generate AI EOS health report
    const { result: aiResult, usage } = await generateEOSHealthReport({
      vtoData,
      orgChart,
      scorecardMetrics,
      idsIssues,
      rocks,
      meetings,
      eodReports,
    })

    const id = generateId()

    await sql`
      INSERT INTO eos_health_reports (
        id, org_id, workspace_id, quarter,
        scores, overall_grade, ai_analysis, recommendations,
        created_by, created_at
      )
      VALUES (
        ${id},
        ${auth.organization.id},
        ${workspaceId},
        ${quarter},
        ${JSON.stringify(aiResult.scores)}::jsonb,
        ${aiResult.overallGrade},
        ${aiResult.analysis},
        ${JSON.stringify(aiResult.recommendations)}::jsonb,
        ${auth.user.id},
        NOW()
      )
    `

    await recordUsage({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action: "eos-health-report",
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    })

    const report: EOSHealthReport = {
      id,
      orgId: auth.organization.id,
      workspaceId,
      quarter,
      scores: aiResult.scores,
      overallGrade: aiResult.overallGrade,
      aiAnalysis: aiResult.analysis,
      recommendations: aiResult.recommendations,
      createdBy: auth.user.id,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<EOSHealthReport>>({
      success: true,
      data: report,
    })
  } catch (error) {
    logError(logger, "Generate EOS health report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate EOS health report" },
      { status: 500 }
    )
  }
})
