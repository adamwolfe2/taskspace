import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { logIntegrationEvent } from "@/lib/audit/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { Errors } from "@/lib/api/errors"
import { z } from "zod"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const advancedExportSchema = z.object({
  type: z.enum(["tasks", "rocks", "eod_reports", "audit_logs", "team_summary"]),
  format: z.enum(["json", "csv"]).default("json"),
  dateRange: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).optional(),
  filters: z.object({
    memberId: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
  }).optional(),
  columns: z.array(z.string()).optional(),
  includeMetadata: z.boolean().default(false),
})

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
          Owner: rock.userId ? (memberMap.get(rock.userId)?.name || "Unknown") : (rock.ownerEmail || "Pending"),
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
    logError(logger, "Export error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to export data" },
      { status: 500 }
    )
  }
}

// ============================================
// ADVANCED EXPORT FUNCTIONS
// ============================================

async function fetchAuditLogs(
  organizationId: string,
  dateRange?: { start: string; end: string }
): Promise<Record<string, unknown>[]> {
  // Use parameterized queries to prevent SQL injection
  const { rows: logs } = await sql`
    SELECT
      id,
      action,
      actor_id,
      actor_type,
      resource_type,
      resource_id,
      details,
      ip_address,
      severity,
      created_at
    FROM audit_logs
    WHERE organization_id = ${organizationId}
      AND (${dateRange?.start ?? null}::date IS NULL OR created_at >= ${dateRange?.start ?? null}::date)
      AND (${dateRange?.end ?? null}::date IS NULL OR created_at < ${dateRange?.end ?? null}::date + interval '1 day')
    ORDER BY created_at DESC
    LIMIT 10000
  `

  return logs.map((l: Record<string, unknown>) => ({
    id: l.id,
    action: l.action,
    actorId: l.actor_id,
    actorType: l.actor_type,
    resourceType: l.resource_type,
    resourceId: l.resource_id,
    details: l.details,
    ipAddress: l.ip_address,
    severity: l.severity,
    createdAt: l.created_at,
  }))
}

async function fetchTeamSummary(
  organizationId: string,
  dateRange?: { start: string; end: string }
): Promise<Record<string, unknown>[]> {
  // OPTIMIZED: Use a single query with CTEs instead of N+1 queries
  // This reduces queries from 4*N to 1 (where N = number of members)
  const startDate = dateRange?.start ?? null
  const endDate = dateRange?.end ?? null

  const { rows: memberStats } = await sql`
    WITH active_members AS (
      SELECT
        om.id,
        om.name,
        om.email,
        om.department,
        om.role
      FROM organization_members om
      WHERE om.organization_id = ${organizationId}
      AND om.status = 'active'
    ),
    task_stats AS (
      SELECT
        assignee_id,
        COUNT(*) as total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks
      FROM assigned_tasks
      WHERE organization_id = ${organizationId}
      AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
      AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
      GROUP BY assignee_id
    ),
    rock_stats AS (
      SELECT
        user_id,
        COUNT(*) as total_rocks,
        AVG(progress) as avg_progress
      FROM rocks
      WHERE organization_id = ${organizationId}
      AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
      AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
      GROUP BY user_id
    ),
    eod_stats AS (
      SELECT
        user_id,
        COUNT(*) as eod_submissions
      FROM eod_reports
      WHERE organization_id = ${organizationId}
      AND (${startDate}::date IS NULL OR date >= ${startDate})
      AND (${endDate}::date IS NULL OR date <= ${endDate})
      GROUP BY user_id
    )
    SELECT
      am.id as member_id,
      am.name,
      am.email,
      am.department,
      am.role,
      COALESCE(ts.total_tasks, 0)::int as total_tasks,
      COALESCE(ts.completed_tasks, 0)::int as completed_tasks,
      CASE
        WHEN COALESCE(ts.total_tasks, 0) > 0
        THEN ROUND((COALESCE(ts.completed_tasks, 0)::numeric / ts.total_tasks::numeric) * 100)::int
        ELSE 0
      END as completion_rate,
      COALESCE(rs.total_rocks, 0)::int as total_rocks,
      COALESCE(es.eod_submissions, 0)::int as eod_submissions,
      COALESCE(ROUND(rs.avg_progress), 0)::int as avg_rock_progress
    FROM active_members am
    LEFT JOIN task_stats ts ON ts.assignee_id = am.id
    LEFT JOIN rock_stats rs ON rs.user_id = am.id
    LEFT JOIN eod_stats es ON es.user_id = am.id
    ORDER BY am.name
  `

  return memberStats.map((row: Record<string, unknown>) => ({
    memberId: row.member_id,
    name: row.name,
    email: row.email,
    department: row.department,
    role: row.role,
    totalTasks: row.total_tasks,
    completedTasks: row.completed_tasks,
    completionRate: row.completion_rate,
    totalRocks: row.total_rocks,
    eodSubmissions: row.eod_submissions,
    avgRockProgress: row.avg_rock_progress,
  }))
}

// ============================================
// POST - Advanced Export with More Options
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    // Only admins can use advanced export
    if (!isAdmin(auth)) {
      return Errors.insufficientPermissions("use advanced export").toResponse()
    }

    const body = await validateBody(request, advancedExportSchema)
    let data: Record<string, unknown>[]
    let filename: string

    switch (body.type) {
      case "audit_logs":
        data = await fetchAuditLogs(auth.organization.id, body.dateRange)
        filename = `audit-logs-export-${new Date().toISOString().split("T")[0]}`
        break

      case "team_summary":
        data = await fetchTeamSummary(auth.organization.id, body.dateRange)
        filename = `team-summary-export-${new Date().toISOString().split("T")[0]}`
        break

      case "tasks": {
        let tasks = await db.assignedTasks.findByOrganizationId(auth.organization.id)
        if (body.filters?.memberId) {
          tasks = tasks.filter((t) => t.assigneeId === body.filters?.memberId)
        }
        if (body.filters?.status) {
          tasks = tasks.filter((t) => t.status === body.filters?.status)
        }
        if (body.filters?.priority) {
          tasks = tasks.filter((t) => t.priority === body.filters?.priority)
        }
        if (body.dateRange) {
          tasks = tasks.filter((t) =>
            t.createdAt >= body.dateRange!.start &&
            t.createdAt <= body.dateRange!.end
          )
        }
        data = tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description || "",
          assigneeName: task.assigneeName || "Unknown",
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate || "",
          completedAt: task.completedAt || "",
          createdAt: task.createdAt,
        }))
        filename = `tasks-export-${new Date().toISOString().split("T")[0]}`
        break
      }

      case "rocks": {
        let rocks = await db.rocks.findByOrganizationId(auth.organization.id)
        if (body.filters?.memberId) {
          rocks = rocks.filter((r) => r.userId === body.filters?.memberId)
        }
        if (body.filters?.status) {
          rocks = rocks.filter((r) => r.status === body.filters?.status)
        }
        if (body.dateRange) {
          rocks = rocks.filter((r) =>
            r.createdAt >= body.dateRange!.start &&
            r.createdAt <= body.dateRange!.end
          )
        }
        data = rocks.map((rock) => ({
          id: rock.id,
          title: rock.title,
          description: rock.description || "",
          progress: rock.progress,
          status: rock.status,
          quarter: rock.quarter || "",
          dueDate: rock.dueDate || "",
          createdAt: rock.createdAt,
        }))
        filename = `rocks-export-${new Date().toISOString().split("T")[0]}`
        break
      }

      case "eod_reports": {
        let reports = await db.eodReports.findByOrganizationId(auth.organization.id)
        const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
        const memberMap = new Map(members.map((m) => [m.id, m]))
        if (body.filters?.memberId) {
          reports = reports.filter((r) => r.userId === body.filters?.memberId)
        }
        if (body.dateRange) {
          reports = reports.filter((r) =>
            r.date >= body.dateRange!.start &&
            r.date <= body.dateRange!.end
          )
        }
        data = reports.map((report) => ({
          id: report.id,
          date: report.date,
          memberName: memberMap.get(report.userId)?.name || "Unknown",
          tasksCompleted: report.tasks?.length || 0,
          challenges: report.challenges || "",
          needsEscalation: report.needsEscalation ? "Yes" : "No",
          submittedAt: report.submittedAt,
        }))
        filename = `eod-reports-export-${new Date().toISOString().split("T")[0]}`
        break
      }

      default:
        return Errors.validationError("Invalid export type").toResponse()
    }

    // Log the export
    await logIntegrationEvent(
      "integration.data_exported",
      auth.organization.id,
      auth.user.id,
      {
        exportType: body.type,
        format: body.format,
        recordCount: data.length,
        dateRange: body.dateRange,
      }
    )

    // Filter columns if specified
    if (body.columns && body.columns.length > 0) {
      data = data.map((row) => {
        const filtered: Record<string, unknown> = {}
        for (const col of body.columns!) {
          if (col in row) {
            filtered[col] = row[col]
          }
        }
        return filtered
      })
    }

    // Format response based on requested format
    if (body.format === "csv") {
      const csv = arrayToCSV(data, body.columns)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      })
    }

    // JSON format
    const response: Record<string, unknown> = {
      type: body.type,
      exportedAt: new Date().toISOString(),
      recordCount: data.length,
      dateRange: body.dateRange || null,
      data,
    }

    if (body.includeMetadata) {
      response.organization = {
        id: auth.organization.id,
        name: auth.organization.name,
      }
      response.exportedBy = {
        id: auth.user.id,
        name: auth.member.name,
      }
    }

    return new NextResponse(JSON.stringify(response, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}.json"`,
      },
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Errors.validationError(error.message).toResponse()
    }
    logError(logger, "Advanced export error", error)
    return Errors.internal().toResponse()
  }
}
