import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import type { EODReport, ApiResponse } from "@/lib/types"

// GET /api/eod-reports - Get EOD reports
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const date = searchParams.get("date")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let reports: EODReport[]

    if (isAdmin(auth)) {
      // Admins can see all reports
      reports = await db.eodReports.findByOrganizationId(auth.organization.id)

      // Filter by user if specified
      if (userId) {
        reports = reports.filter(r => r.userId === userId)
      }
    } else {
      // Regular members see only their reports
      reports = await db.eodReports.findByUserId(auth.user.id, auth.organization.id)
    }

    // Filter by specific date
    if (date) {
      reports = reports.filter(r => r.date === date)
    }

    // Filter by date range
    if (startDate) {
      reports = reports.filter(r => r.date >= startDate)
    }
    if (endDate) {
      reports = reports.filter(r => r.date <= endDate)
    }

    // Sort by date descending
    reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json<ApiResponse<EODReport[]>>({
      success: true,
      data: reports,
    })
  } catch (error) {
    console.error("Get EOD reports error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get EOD reports" },
      { status: 500 }
    )
  }
}

// POST /api/eod-reports - Submit an EOD report
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      tasks,
      challenges,
      tomorrowPriorities,
      needsEscalation,
      escalationNote,
      date,
    } = body

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one completed task is required" },
        { status: 400 }
      )
    }

    if (!tomorrowPriorities || !Array.isArray(tomorrowPriorities) || tomorrowPriorities.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one priority for tomorrow is required" },
        { status: 400 }
      )
    }

    const reportDate = date || new Date().toISOString().split("T")[0]

    // Check if report already exists for this date
    const existingReport = await db.eodReports.findByUserAndDate(
      auth.user.id,
      auth.organization.id,
      reportDate
    )

    if (existingReport) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You have already submitted an EOD report for this date" },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const report: EODReport = {
      id: generateId(),
      organizationId: auth.organization.id,
      userId: auth.user.id,
      date: reportDate,
      tasks,
      challenges: challenges || "",
      tomorrowPriorities,
      needsEscalation: needsEscalation || false,
      escalationNote: needsEscalation ? escalationNote : null,
      submittedAt: now,
      createdAt: now,
    }

    await db.eodReports.create(report)

    // Mark any completed tasks as added to EOD
    for (const task of tasks) {
      if (task.taskId) {
        const assignedTask = await db.assignedTasks.findById(task.taskId)
        if (assignedTask && assignedTask.assigneeId === auth.user.id) {
          await db.assignedTasks.update(task.taskId, {
            addedToEOD: true,
            eodReportId: report.id,
            status: "completed",
            completedAt: now,
          })
        }
      }
    }

    // TODO: Send email notification to admin if escalation
    // TODO: Send EOD summary email

    return NextResponse.json<ApiResponse<EODReport>>({
      success: true,
      data: report,
      message: "EOD report submitted successfully",
    })
  } catch (error) {
    console.error("Submit EOD report error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to submit EOD report" },
      { status: 500 }
    )
  }
}

// PATCH /api/eod-reports - Update an EOD report (same day only)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report ID is required" },
        { status: 400 }
      )
    }

    const report = await db.eodReports.findById(id)
    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    // Verify report belongs to this organization
    if (report.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    // Only the report author can update
    if (report.userId !== auth.user.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only update your own reports" },
        { status: 403 }
      )
    }

    // Can only update same-day reports
    const today = new Date().toISOString().split("T")[0]
    if (report.date !== today) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only update today's report" },
        { status: 400 }
      )
    }

    const updatedReport = await db.eodReports.update(id, {
      ...updates,
      submittedAt: new Date().toISOString(),
    })

    return NextResponse.json<ApiResponse<EODReport | null>>({
      success: true,
      data: updatedReport,
      message: "EOD report updated successfully",
    })
  } catch (error) {
    console.error("Update EOD report error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update EOD report" },
      { status: 500 }
    )
  }
}

// DELETE /api/eod-reports - Delete an EOD report (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can delete EOD reports" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report ID is required" },
        { status: 400 }
      )
    }

    const report = await db.eodReports.findById(id)
    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    // Verify report belongs to this organization
    if (report.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    await db.eodReports.delete(id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "EOD report deleted successfully",
    })
  } catch (error) {
    console.error("Delete EOD report error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete EOD report" },
      { status: 500 }
    )
  }
}
