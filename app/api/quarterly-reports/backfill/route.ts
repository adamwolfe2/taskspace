import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import {
  createQuarterlyReport,
  listQuarterlyReports,
} from "@/lib/db/quarterly-reports"
import type { ApiResponse, QuarterlyReport } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// POST /api/quarterly-reports/backfill
// Admin-only: create a report record for a past quarter so it can be generated.
// Body: { workspaceId, quarter, periodStart, periodEnd }
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json() as {
      workspaceId: string
      quarter: string
      periodStart: string
      periodEnd: string
    }
    const { workspaceId, quarter, periodStart, periodEnd } = body

    if (!workspaceId || !quarter || !periodStart || !periodEnd) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId, quarter, periodStart, and periodEnd are required" },
        { status: 400 }
      )
    }

    // Check if a report for this quarter already exists
    const existing = await listQuarterlyReports(auth.organization.id, workspaceId)
    const alreadyExists = existing.some(r => r.quarter === quarter)
    if (alreadyExists) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `A report for ${quarter} already exists` },
        { status: 409 }
      )
    }

    const id = "qr_" + generateId()
    const report = await createQuarterlyReport({
      id,
      orgId: auth.organization.id,
      workspaceId,
      quarter,
      periodStart,
      periodEnd,
      title: `${quarter} Quarterly Report`,
      createdBy: auth.user.id,
    })

    logger.info({ id, quarter, orgId: auth.organization.id }, "Quarterly report backfill record created")

    return NextResponse.json<ApiResponse<QuarterlyReport>>(
      { success: true, data: report },
      { status: 201 }
    )
  } catch (error) {
    logError(logger, "Quarterly report backfill error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create backfill report" },
      { status: 500 }
    )
  }
})
