import { NextRequest, NextResponse } from "next/server"
import { getQuarterlyReportByToken } from "@/lib/db/quarterly-reports"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, QuarterlyReport } from "@/lib/types"
import { logError, logger } from "@/lib/logger"

// GET /api/public/quarterly/[token]
// No auth required — public share link
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid link" },
        { status: 400 }
      )
    }

    const report = await getQuarterlyReportByToken(token)
    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found or not publicly published" },
        { status: 404 }
      )
    }

    // Fetch workspace branding (with org fallback) and enrich member names in parallel
    const [brandingResult, memberNamesResult] = await Promise.all([
      sql`
        SELECT
          w.name AS workspace_name,
          COALESCE(w.logo_url, o.logo_url) AS logo_url,
          COALESCE(w.accent_color, o.accent_color) AS accent_color
        FROM workspaces w
        JOIN organizations o ON o.id = w.organization_id
        WHERE w.id = ${report.workspaceId}
        LIMIT 1
      `,
      // Re-query live member names to fix any null names stored in old report data
      sql`
        SELECT
          om.id AS member_id,
          om.user_id,
          COALESCE(om.name, u.name, u.email, 'Team Member') AS name
        FROM organization_members om
        LEFT JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ${report.orgId}
          AND om.status = 'active'
      `,
    ])

    const branding = brandingResult.rows[0] as Record<string, unknown> | undefined

    // Build lookup map: userId -> live name
    const liveNameByUserId = new Map<string, string>()
    const liveNameByMemberId = new Map<string, string>()
    for (const row of memberNamesResult.rows as Record<string, unknown>[]) {
      if (row.user_id) liveNameByUserId.set(row.user_id as string, row.name as string)
      if (row.member_id) liveNameByMemberId.set(row.member_id as string, row.name as string)
    }

    // Enrich report members with live names
    const enrichedReport: QuarterlyReport = {
      ...report,
      data: {
        ...report.data,
        members: report.data.members.map(m => ({
          ...m,
          name: m.name || liveNameByUserId.get(m.userId) || liveNameByMemberId.get(m.memberId) || "Team Member",
        })),
      },
    }

    return NextResponse.json<ApiResponse<{
      report: QuarterlyReport
      organization: { name: string; logoUrl?: string; accentColor?: string }
    }>>({
      success: true,
      data: {
        report: enrichedReport,
        organization: {
          name: (branding?.workspace_name as string) || "Organization",
          logoUrl: (branding?.logo_url as string) || undefined,
          accentColor: (branding?.accent_color as string) || undefined,
        },
      },
    })
  } catch (error) {
    logError(logger, "Public quarterly report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load report" },
      { status: 500 }
    )
  }
}
