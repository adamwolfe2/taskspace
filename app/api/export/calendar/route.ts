import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { enforceIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"

// Generate iCalendar (ICS) format for calendar apps
function generateICS(events: Array<{
  uid: string
  summary: string
  description?: string
  dtstart: string
  dtend?: string
  categories?: string[]
}>): string {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  }

  const escapeICS = (text: string): string => {
    return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n")
  }

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Taskspace//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ]

  for (const event of events) {
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${event.uid}`)
    lines.push(`DTSTAMP:${formatDate(new Date().toISOString())}`)
    lines.push(`DTSTART:${formatDate(event.dtstart)}`)

    if (event.dtend) {
      lines.push(`DTEND:${formatDate(event.dtend)}`)
    } else {
      // All-day event: end is start + 1 day
      const endDate = new Date(event.dtstart)
      endDate.setDate(endDate.getDate() + 1)
      lines.push(`DTEND:${formatDate(endDate.toISOString())}`)
    }

    lines.push(`SUMMARY:${escapeICS(event.summary)}`)

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
    }

    if (event.categories && event.categories.length > 0) {
      lines.push(`CATEGORIES:${event.categories.join(",")}`)
    }

    lines.push("END:VEVENT")
  }

  lines.push("END:VCALENDAR")

  return lines.join("\r\n")
}

// GET /api/export/calendar - Export tasks and rocks as ICS calendar
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    // IP-based rate limiting: 10 requests per IP per minute
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "export-calendar", maxRequests: 10, windowMs: 60 * 1000 }
    )
    if (rateLimitResponse) return rateLimitResponse as NextResponse<ApiResponse<null>>

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all" // tasks, rocks, or all
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const events: Array<{
      uid: string
      summary: string
      description?: string
      dtstart: string
      dtend?: string
      categories?: string[]
    }> = []

    // Add tasks
    if (type === "tasks" || type === "all") {
      let tasks = await db.assignedTasks.findByAssigneeId(auth.user.id, auth.organization.id)

      // Filter by date range
      if (startDate) {
        tasks = tasks.filter((t) => t.dueDate && t.dueDate >= startDate)
      }
      if (endDate) {
        tasks = tasks.filter((t) => t.dueDate && t.dueDate <= endDate)
      }

      // Only include incomplete tasks
      tasks = tasks.filter((t) => t.status !== "completed")

      for (const task of tasks) {
        if (task.dueDate) {
          const priorityLabel = task.priority === "high" ? "\uD83D\uDD34 " : task.priority === "medium" ? "\uD83D\uDFE1 " : ""
          events.push({
            uid: `task-${task.id}@align`,
            summary: `${priorityLabel}[Task] ${task.title}`,
            description: task.description || undefined,
            dtstart: task.dueDate,
            categories: ["Task", task.priority],
          })
        }
      }
    }

    // Add rocks
    if (type === "rocks" || type === "all") {
      let rocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id)

      // Filter by date range
      if (startDate) {
        rocks = rocks.filter((r) => r.dueDate && r.dueDate >= startDate)
      }
      if (endDate) {
        rocks = rocks.filter((r) => r.dueDate && r.dueDate <= endDate)
      }

      // Only include non-completed rocks
      rocks = rocks.filter((r) => r.status !== "completed")

      for (const rock of rocks) {
        if (rock.dueDate) {
          events.push({
            uid: `rock-${rock.id}@align`,
            summary: `\uD83C\uDFAF [Rock] ${rock.title}`,
            description: rock.description || undefined,
            dtstart: rock.dueDate,
            categories: ["Rock", rock.quarter || "Q1"],
          })
        }
      }
    }

    const ics = generateICS(events)
    const filename = `align-calendar-${new Date().toISOString().split("T")[0]}.ics`

    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    // ICS file response — not JSON, so cast is required for withAuth's type signature
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        ...rlHeaders,
      },
    }) as unknown as NextResponse<ApiResponse<null>>
  } catch (error) {
    logError(logger, "Calendar export error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to export calendar" },
      { status: 500 }
    )
  }
})
