import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import { listQuarterlyReports, createQuarterlyReport } from "@/lib/db/quarterly-reports"
import type { ApiResponse, QuarterlyReport } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/quarterly-reports?workspaceId=xxx
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

    const reports = await listQuarterlyReports(auth.organization.id, workspaceId)

    return NextResponse.json<ApiResponse<QuarterlyReport[]>>({
      success: true,
      data: reports,
    })
  } catch (error) {
    logError(logger, "List quarterly reports error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to list quarterly reports" },
      { status: 500 }
    )
  }
})

// POST /api/quarterly-reports — create a new report (blank, then generate separately)
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json() as { workspaceId: string; quarter: string; periodStart: string; periodEnd: string }
    const { workspaceId, quarter, periodStart, periodEnd } = body

    if (!workspaceId || !quarter || !periodStart || !periodEnd) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId, quarter, periodStart, and periodEnd are required" },
        { status: 400 }
      )
    }

    const id = "qr_" + generateId()
    const title = `${quarter} Quarterly Report`

    const report = await createQuarterlyReport({
      id,
      orgId: auth.organization.id,
      workspaceId,
      quarter,
      periodStart,
      periodEnd,
      title,
      createdBy: auth.user.id,
    })

    return NextResponse.json<ApiResponse<QuarterlyReport>>(
      { success: true, data: report },
      { status: 201 }
    )
  } catch (error) {
    logError(logger, "Create quarterly report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create quarterly report" },
      { status: 500 }
    )
  }
})
