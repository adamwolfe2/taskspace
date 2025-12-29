import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"

// Helper to convert array of objects to CSV string
function arrayToCSV(data: Record<string, unknown>[], headers?: string[]): string {
  if (data.length === 0) return ""

  const keys = headers || Object.keys(data[0])

  // Create header row
  const headerRow = keys.map((key) => `"${key}"`).join(",")

  // Create data rows
  const dataRows = data.map((row) => {
    return keys
      .map((key) => {
        const value = row[key]
        if (value === null || value === undefined) return ""
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`
        return `"${String(value).replace(/"/g, '""')}"`
      })
      .join(",")
  })

  return [headerRow, ...dataRows].join("\n")
}

// GET /api/export - Export data as CSV
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
    const type = searchParams.get("type") || "rocks"
    const format = searchParams.get("format") || "csv"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const userId = searchParams.get("userId")

    let data: Record<string, unknown>[] = []
    let filename = ""

    switch (type) {
      case "rocks": {
        const rocks = await db.rocks.findByOrganizationId(auth.organization.id)
        const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
        // Map by user id (which is what rock.userId references)
        const memberMap = new Map(members.map((m) => [m.id, m]))

        data = rocks.map((rock) => ({
          Title: rock.title,
          Description: rock.description || "",
          Owner: memberMap.get(rock.userId)?.name || "Unknown",
          Status: rock.status,
          Progress: `${rock.progress}%`,
          Quarter: rock.quarter || "",
          "Due Date": rock.dueDate || "",
          "Created At": rock.createdAt,
        }))
        filename = `rocks-export-${new Date().toISOString().split("T")[0]}.csv`
        break
      }

      case "tasks": {
        let tasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)

        // Filter by user if specified
        if (userId) {
          tasks = tasks.filter((t) => t.assigneeId === userId)
        }

        // Filter by date range if specified
        if (startDate) {
          tasks = tasks.filter((t) => t.createdAt >= startDate)
        }
        if (endDate) {
          tasks = tasks.filter((t) => t.createdAt <= endDate)
        }

        data = tasks.map((task) => ({
          Title: task.title,
          Description: task.description || "",
          Assignee: task.assigneeName || "Unknown",
          "Assigned By": task.assignedByName || "Self",
          Type: task.type,
          Priority: task.priority,
          Status: task.status,
          "Due Date": task.dueDate || "",
          "Completed At": task.completedAt || "",
          "Created At": task.createdAt,
        }))
        filename = `tasks-export-${new Date().toISOString().split("T")[0]}.csv`
        break
      }

      case "eod-reports": {
        // Only admins can export all EOD reports
        if (!isAdmin(auth)) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Only admins can export EOD reports" },
            { status: 403 }
          )
        }

        let reports = await db.eodReports.findByOrganizationId(auth.organization.id)
        const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
        const memberMap = new Map(members.map((m) => [m.id, m]))

        // Filter by user if specified
        if (userId) {
          reports = reports.filter((r) => r.userId === userId)
        }

        // Filter by date range if specified
        if (startDate) {
          reports = reports.filter((r) => r.date >= startDate)
        }
        if (endDate) {
          reports = reports.filter((r) => r.date <= endDate)
        }

        data = reports.map((report) => ({
          Date: report.date,
          "Team Member": memberMap.get(report.userId)?.name || "Unknown",
          "Tasks Completed": report.tasks?.map((t) => t.text).join("; ") || "",
          Challenges: report.challenges || "",
          "Tomorrow Priorities": report.tomorrowPriorities?.map((p) => p.text).join("; ") || "",
          "Needs Escalation": report.needsEscalation ? "Yes" : "No",
          "Escalation Note": report.escalationNote || "",
          "Submitted At": report.submittedAt,
        }))
        filename = `eod-reports-export-${new Date().toISOString().split("T")[0]}.csv`
        break
      }

      case "team": {
        // Only admins can export team data
        if (!isAdmin(auth)) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Only admins can export team data" },
            { status: 403 }
          )
        }

        const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)

        data = members.map((member) => ({
          Name: member.name,
          Email: member.email,
          Role: member.role,
          Department: member.department,
          Status: member.status || "active",
          "Join Date": member.joinDate,
        }))
        filename = `team-export-${new Date().toISOString().split("T")[0]}.csv`
        break
      }

      default:
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Invalid export type. Use: rocks, tasks, eod-reports, or team" },
          { status: 400 }
        )
    }

    if (format === "json") {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename.replace(".csv", ".json")}"`,
        },
      })
    }

    // Default to CSV
    const csv = arrayToCSV(data)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to export data" },
      { status: 500 }
    )
  }
}
