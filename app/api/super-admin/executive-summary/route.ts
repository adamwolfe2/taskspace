import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateExecutiveSummary } from "@/lib/ai/executive-summary"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface ExecutiveSummaryData {
  summary: string
  orgHighlights: Array<{
    orgName: string
    status: "healthy" | "needs-attention" | "critical"
    headline: string
  }>
  topConcerns: string[]
  topWins: string[]
  recommendations: string[]
  generatedAt: string
}

// GET /api/super-admin/executive-summary — AI-generated daily briefing across all orgs
export const GET = withSuperAdmin(async (_request: NextRequest) => {
  try {
    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI is not configured. Set ANTHROPIC_API_KEY in environment." },
        { status: 503 }
      )
    }

    // Gather cross-org data for the AI context
    const { rows: orgs } = await sql`SELECT id, name FROM organizations`

    const orgDataPromises = orgs.map(async (org) => {
      const orgId = org.id as string
      const orgName = org.name as string

      // Member count
      const { rows: memberRows } = await sql`
        SELECT COUNT(*) as count FROM organization_members
        WHERE organization_id = ${orgId} AND status = 'active'
      `
      const memberCount = parseInt(memberRows[0]?.count as string || "0", 10)

      // EODs today
      const today = new Date().toISOString().split("T")[0]
      const { rows: eodRows } = await sql`
        SELECT COUNT(DISTINCT user_id) as count FROM eod_reports
        WHERE organization_id = ${orgId}
          AND created_at >= ${today}::date
          AND created_at < (${today}::date + INTERVAL '1 day')
      `
      const eodsToday = parseInt(eodRows[0]?.count as string || "0", 10)

      // Recent escalations
      const { rows: escalationRows } = await sql`
        SELECT er.escalation_note, u.name as user_name, er.created_at
        FROM eod_reports er
        JOIN users u ON er.user_id = u.id
        WHERE er.organization_id = ${orgId}
          AND er.needs_escalation = TRUE
          AND er.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY er.created_at DESC
        LIMIT 5
      `

      // Active tasks summary
      const { rows: taskRows } = await sql`
        SELECT
          COUNT(*) FILTER (WHERE t.status = 'in_progress') as active,
          COUNT(*) FILTER (WHERE t.status = 'completed' AND t.completed_at >= NOW() - INTERVAL '7 days') as completed_week
        FROM tasks t
        JOIN workspaces w ON t.workspace_id = w.id
        WHERE w.organization_id = ${orgId}
      `

      // Rock summary
      const { rows: rockRows } = await sql`
        SELECT r.title, r.progress, r.status, u.name as owner_name
        FROM rocks r
        JOIN workspaces w ON r.workspace_id = w.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE w.organization_id = ${orgId}
          AND r.status != 'completed'
        ORDER BY r.progress ASC
        LIMIT 10
      `

      // Recent EOD summaries (last 24h)
      const { rows: recentEods } = await sql`
        SELECT u.name as user_name, er.raw_text, er.needs_escalation, er.escalation_note
        FROM eod_reports er
        JOIN users u ON er.user_id = u.id
        WHERE er.organization_id = ${orgId}
          AND er.created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY er.created_at DESC
        LIMIT 10
      `

      return {
        orgName,
        memberCount,
        eodsToday,
        eodRate: memberCount > 0 ? Math.round((eodsToday / memberCount) * 100) : 0,
        escalations: escalationRows.map(e => ({
          userName: e.user_name as string,
          note: e.escalation_note as string,
        })),
        activeTasks: parseInt(taskRows[0]?.active as string || "0", 10),
        completedThisWeek: parseInt(taskRows[0]?.completed_week as string || "0", 10),
        rocks: rockRows.map(r => ({
          title: r.title as string,
          progress: r.progress as number,
          status: r.status as string,
          owner: (r.owner_name as string) || "Unassigned",
        })),
        recentEodSummaries: recentEods.map(e => ({
          userName: e.user_name as string,
          text: ((e.raw_text as string) || "").slice(0, 200),
          hasEscalation: e.needs_escalation as boolean,
          escalationNote: e.escalation_note as string | null,
        })),
      }
    })

    const orgData = await Promise.all(orgDataPromises)

    const result = await generateExecutiveSummary(orgData)

    const summaryData: ExecutiveSummaryData = {
      ...result,
      generatedAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<ExecutiveSummaryData>>({
      success: true,
      data: summaryData,
    })
  } catch (error) {
    logError(logger, "Executive summary error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate executive summary" },
      { status: 500 }
    )
  }
})
