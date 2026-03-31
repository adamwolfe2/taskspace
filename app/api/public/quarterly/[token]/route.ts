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

    // Fetch org branding
    const orgResult = await sql`
      SELECT name, logo_url, accent_color
      FROM organizations
      WHERE id = ${report.orgId}
      LIMIT 1
    `
    const org = orgResult.rows[0] as Record<string, unknown> | undefined

    return NextResponse.json<ApiResponse<{
      report: QuarterlyReport
      organization: { name: string; logoUrl?: string; accentColor?: string }
    }>>({
      success: true,
      data: {
        report,
        organization: {
          name: (org?.name as string) || "Organization",
          logoUrl: (org?.logo_url as string) || undefined,
          accentColor: (org?.accent_color as string) || undefined,
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
