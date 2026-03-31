import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import { getQuarterlyReport, updateQuarterlyReportData, deleteQuarterlyReport } from "@/lib/db/quarterly-reports"
import type { ApiResponse, QuarterlyReport } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/quarterly-reports/[id]
export const GET = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const { id } = await context!.params
    const report = await getQuarterlyReport(id, auth.organization.id)

    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<QuarterlyReport>>({ success: true, data: report })
  } catch (error) {
    logError(logger, "Get quarterly report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get quarterly report" },
      { status: 500 }
    )
  }
})

// PATCH /api/quarterly-reports/[id] — update status or publish
export const PATCH = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const { id } = await context!.params
    const body = await request.json() as { status?: QuarterlyReport["status"]; publish?: boolean }

    const updates: Parameters<typeof updateQuarterlyReportData>[2] = {}

    if (body.status) {
      updates.status = body.status
    }

    if (body.publish) {
      updates.status = "published"
      updates.publicToken = "qrpub_" + generateId()
    }

    const report = await updateQuarterlyReportData(id, auth.organization.id, updates)

    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<QuarterlyReport>>({ success: true, data: report })
  } catch (error) {
    logError(logger, "Update quarterly report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update quarterly report" },
      { status: 500 }
    )
  }
})

// DELETE /api/quarterly-reports/[id]
export const DELETE = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const { id } = await context!.params
    const deleted = await deleteQuarterlyReport(id, auth.organization.id)

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<null>>({ success: true, data: null })
  } catch (error) {
    logError(logger, "Delete quarterly report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete quarterly report" },
      { status: 500 }
    )
  }
})
