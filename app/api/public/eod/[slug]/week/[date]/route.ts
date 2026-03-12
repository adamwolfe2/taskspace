/**
 * Public Weekly EOD Report API
 *
 * This endpoint provides public access to aggregated EOD reports for a week.
 * Shows consolidated weekly report every Thursday (Friday-Thursday week).
 * No authentication required - designed for sharing with stakeholders/board members.
 *
 * URL format: /api/public/eod/[org-slug]/week/[date]
 * Example: /api/public/eod/aims/week/2026-01-08 (Thursday date)
 */

import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual, createHash } from "crypto"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import { enforceIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"

interface WeeklyTask {
  description: string
  rockTitle?: string
  date: string
  completedAt?: string
}

interface WeeklyPriority {
  description: string
  rockTitle?: string
  date: string
}

// Attachment from EOD reports
interface WeeklyAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  date: string
}

// Rock progress for bento cards
interface PublicRockProgress {
  id: string
  progress: number
  status: "on-track" | "at-risk" | "blocked" | "completed"
}

// Helper to calculate quarter from date (e.g., "2026-01-08" -> "Q1 2026")
function getQuarterFromDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z")
  const month = date.getMonth() // 0-11
  const year = date.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

interface WeeklyUserReport {
  userName: string
  userRole: "owner" | "admin" | "member"
  department: string
  jobTitle?: string
  totalReports: number
  totalTasks: number
  tasks: WeeklyTask[]
  challenges: string[]
  priorities: WeeklyPriority[]
  escalations: Array<{ date: string; note: string }>
  attachments: WeeklyAttachment[]
  // New fields for bento cards
  rocks: PublicRockProgress[]
}

// Scorecard data for the weekly report
interface ScorecardEntry {
  memberId: string
  memberName: string
  department: string
  metricName: string
  weeklyGoal: number | null
  actualValue: number | null
  isOnTrack: boolean
}

interface WeeklyReport {
  organizationName: string
  organizationLogo?: string
  accentColor?: string | null
  weekEnding: string
  weekRange: string
  displayWeek: string
  timezone: string
  lastUpdated: string
  userReports: WeeklyUserReport[]
  weeklyStats: {
    totalReports: number
    totalTasks: number
    totalEscalations: number
    averageTasksPerDay: number
    submissionsByDay: Array<{ date: string; displayDate: string; count: number; total: number }>
  }
  // Weekly scorecard data
  scorecard: ScorecardEntry[]
}

// GET /api/public/eod/[slug]/week/[date] - Get weekly EOD report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; date: string }> }
) {
  try {
    // IP-based rate limiting: 30 requests per IP per 15 minutes
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "public-eod-weekly", maxRequests: 30 }
    )
    if (rateLimitResponse) return rateLimitResponse

    const { slug, date } = await params

    // Validate date format (YYYY-MM-DD) - should be a Thursday
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const response = NextResponse.json(
        { success: false, error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      )
      response.headers.set("X-Robots-Tag", "noindex, nofollow")
      return response
    }

    // Calculate week range (Friday to Thursday)
    const endDate = new Date(date + "T12:00:00Z")
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6) // Go back 6 days to Friday

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = date

    // Find organization by slug
    const { rows: orgs } = await sql`
      SELECT id, name, settings
      FROM organizations
      WHERE slug = ${slug}
    `

    if (orgs.length === 0) {
      const response = NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
      response.headers.set("X-Robots-Tag", "noindex, nofollow")
      return response
    }

    const org = orgs[0]
    const orgId = org.id as string
    const orgName = org.name as string
    const settings = org.settings as { timezone?: string; customBranding?: { logo?: string }; publicEodToken?: string } | null
    const timezone = settings?.timezone || "America/Los_Angeles"
    const orgLogo = settings?.customBranding?.logo

    // Optional access token protection for public EOD endpoints
    const { searchParams } = new URL(request.url)
    const providedToken = searchParams.get("token")
    if (settings?.publicEodToken) {
      const hashToken = (t: string) => createHash("sha256").update(t).digest()
      const tokenMatch = providedToken !== null &&
        timingSafeEqual(hashToken(providedToken), hashToken(settings.publicEodToken))
      if (!tokenMatch) {
        const response = NextResponse.json(
          { success: false, error: "Invalid or missing access token" },
          { status: 403 }
        )
        response.headers.set("X-Robots-Tag", "noindex, nofollow")
        return response
      }
    }
    // If no token configured, allow open access (original behavior)

    logger.info({ orgSlug: slug, date }, "Public weekly EOD accessed")

    // Get accent color from the org's default workspace
    const { rows: wsRows } = await sql`
      SELECT accent_color, primary_color
      FROM workspaces
      WHERE organization_id = ${orgId}
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1
    `
    const accentColor = wsRows.length > 0
      ? ((wsRows[0].accent_color || wsRows[0].primary_color) as string | null)
      : null

    // Get all active members (join with users to get name if missing in members)
    const { rows: members } = await sql`
      SELECT
        om.id,
        om.user_id,
        COALESCE(NULLIF(om.name, ''), u.name, 'Unknown') as name,
        COALESCE(om.email, u.email) as email,
        om.role,
        om.department,
        om.job_title,
        om.status
      FROM organization_members om
      LEFT JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = ${orgId}
        AND om.status = 'active'
      ORDER BY
        CASE om.role
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          ELSE 3
        END,
        COALESCE(NULLIF(om.name, ''), u.name) ASC
    `

    // Get EOD reports for the week
    const { rows: reports } = await sql`
      SELECT
        er.id,
        er.user_id,
        er.date,
        er.tasks,
        er.challenges,
        er.tomorrow_priorities,
        er.needs_escalation,
        er.escalation_note,
        er.attachments,
        er.submitted_at,
        er.created_at
      FROM eod_reports er
      WHERE er.organization_id = ${orgId}
        AND er.date >= ${startDateStr}
        AND er.date <= ${endDateStr}
      ORDER BY er.date ASC, er.submitted_at ASC
    `

    // Get rocks for context (with progress and status for bento cards)
    // ALWAYS show rocks from the most recent quarter (not the report date's quarter)
    const { rows: quarterRows } = await sql`
      SELECT quarter
      FROM rocks
      WHERE organization_id = ${orgId}
        AND quarter IS NOT NULL
      ORDER BY
        SPLIT_PART(quarter, ' ', 2)::int DESC,
        SUBSTRING(quarter, 2, 1)::int DESC
      LIMIT 1
    `
    const mostRecentQuarter = quarterRows.length > 0 ? quarterRows[0].quarter as string : getQuarterFromDate(endDateStr)

    const { rows: rocks } = await sql`
      SELECT id, title, user_id, progress, status
      FROM rocks
      WHERE organization_id = ${orgId}
        AND quarter = ${mostRecentQuarter}
    `
    const rockMap = new Map(rocks.map(r => [r.id as string, r.title as string]))

    // Group rocks by user for bento cards
    const rocksByUser = new Map<string, PublicRockProgress[]>()
    for (const rock of rocks) {
      const userId = rock.user_id as string
      if (!rocksByUser.has(userId)) {
        rocksByUser.set(userId, [])
      }
      rocksByUser.get(userId)!.push({
        id: rock.id as string,
        progress: (rock.progress as number) || 0,
        status: (rock.status as PublicRockProgress["status"]) || "on-track",
      })
    }

    // Build member lookup
    const memberMap = new Map(members.map(m => [m.user_id as string, m]))

    // Aggregate reports by user
    const userReportsMap = new Map<string, WeeklyUserReport>()

    for (const report of reports) {
      const member = memberMap.get(report.user_id as string)
      if (!member) continue

      const userId = report.user_id as string

      // Format date properly (PostgreSQL DATE returns Date object)
      const dateValue = report.date
      let reportDate: string
      if (dateValue instanceof Date) {
        reportDate = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`
      } else if (typeof dateValue === 'string') {
        reportDate = dateValue.split('T')[0]
      } else {
        reportDate = String(dateValue)
      }

      if (!userReportsMap.has(userId)) {
        userReportsMap.set(userId, {
          userName: (member.name as string) || "Unknown",
          userRole: member.role as "owner" | "admin" | "member",
          department: (member.department as string) || "General",
          jobTitle: (member.job_title as string) || undefined,
          totalReports: 0,
          totalTasks: 0,
          tasks: [],
          challenges: [],
          priorities: [],
          escalations: [],
          attachments: [],
          rocks: rocksByUser.get(userId) || [],
        })
      }

      const userReport = userReportsMap.get(userId)!
      userReport.totalReports++

      // Add tasks
      const tasks = (report.tasks as Array<{ text: string; rockId?: string; completedAt?: string }>) || []
      for (const task of tasks) {
        if (task.text) {
          userReport.tasks.push({
            description: task.text,
            rockTitle: task.rockId ? rockMap.get(task.rockId) : undefined,
            date: reportDate,
            completedAt: task.completedAt,
          })
          userReport.totalTasks++
        }
      }

      // Add challenges
      const challenges = report.challenges as string
      if (challenges && challenges.trim()) {
        userReport.challenges.push(challenges.trim())
      }

      // Add priorities
      const priorities = (report.tomorrow_priorities as Array<{ text: string; rockId?: string }>) || []
      for (const priority of priorities) {
        if (priority.text) {
          userReport.priorities.push({
            description: priority.text,
            rockTitle: priority.rockId ? rockMap.get(priority.rockId) : undefined,
            date: reportDate,
          })
        }
      }

      // Add escalations
      if (report.needs_escalation && report.escalation_note) {
        userReport.escalations.push({
          date: reportDate,
          note: report.escalation_note as string,
        })
      }

      // Add attachments
      const reportAttachments = report.attachments as Array<{ id: string; name: string; url: string; type: string; size: number }> | null
      if (reportAttachments && Array.isArray(reportAttachments)) {
        for (const attachment of reportAttachments) {
          userReport.attachments.push({
            id: attachment.id,
            name: attachment.name,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size,
            date: reportDate,
          })
        }
      }
    }

    // Convert to array and sort by role then name
    const userReports = Array.from(userReportsMap.values()).sort((a, b) => {
      const roleOrder = { owner: 1, admin: 2, member: 3 }
      const roleA = roleOrder[a.userRole]
      const roleB = roleOrder[b.userRole]
      if (roleA !== roleB) return roleA - roleB
      return a.userName.localeCompare(b.userName)
    })

    // Calculate daily submission stats
    const submissionsByDay: Array<{ date: string; displayDate: string; count: number; total: number }> = []
    const totalMembers = members.length

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0]
      const dayReports = reports.filter(r => {
        const dateValue = r.date
        let reportDate: string
        if (dateValue instanceof Date) {
          reportDate = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`
        } else if (typeof dateValue === 'string') {
          reportDate = dateValue.split('T')[0]
        } else {
          reportDate = String(dateValue)
        }
        return reportDate === dateStr
      })

      // Count unique users who submitted (a user might submit multiple reports per day)
      const uniqueSubmitters = new Set(dayReports.map(r => r.user_id))

      const displayDate = new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })

      submissionsByDay.push({
        date: dateStr,
        displayDate,
        count: uniqueSubmitters.size,
        total: totalMembers,
      })
    }

    // Calculate weekly stats
    const totalReports = reports.length
    const totalTasks = userReports.reduce((sum, u) => sum + u.totalTasks, 0)
    const totalEscalations = userReports.reduce((sum, u) => sum + u.escalations.length, 0)
    const daysWithReports = submissionsByDay.filter(d => d.count > 0).length
    const averageTasksPerDay = daysWithReports > 0 ? Math.round(totalTasks / daysWithReports) : 0

    // Fetch weekly scorecard data from legacy tables (team_member_metrics + weekly_metric_entries).
    // Legacy entries are keyed by week_ending (always a Friday).
    // The URL date is a Thursday — the corresponding Friday is the next day.
    const scorecardFriday = new Date(endDate)
    scorecardFriday.setUTCDate(scorecardFriday.getUTCDate() + 1) // Thursday → Friday
    const scorecardWeekEndingStr = scorecardFriday.toISOString().split("T")[0]

    const { rows: scorecardRows } = await sql`
      SELECT
        tmm.id as metric_id,
        COALESCE(NULLIF(om.name, ''), u.name, 'Unassigned') as member_name,
        COALESCE(om.department, 'General') as department,
        tmm.metric_name,
        tmm.weekly_goal,
        wme.actual_value
      FROM team_member_metrics tmm
      JOIN organization_members om ON om.id = tmm.team_member_id
      LEFT JOIN users u ON u.id = om.user_id
      LEFT JOIN weekly_metric_entries wme ON wme.metric_id = tmm.id
        AND wme.week_ending = ${scorecardWeekEndingStr}::date
      WHERE om.organization_id = ${orgId}
        AND om.status = 'active'
        AND tmm.is_active = true
      ORDER BY COALESCE(NULLIF(om.name, ''), u.name) ASC
    `

    const scorecard: ScorecardEntry[] = scorecardRows.map(row => {
      const goal = row.weekly_goal !== null ? Number(row.weekly_goal) : null
      const actual = row.actual_value !== null ? Number(row.actual_value) : null
      return {
        memberId: row.metric_id as string,
        memberName: row.member_name as string,
        department: (row.department as string) || "General",
        metricName: row.metric_name as string,
        weeklyGoal: goal,
        actualValue: actual,
        isOnTrack: actual !== null && goal !== null && actual >= goal,
      }
    })

    // Format week display
    const weekRangeDisplay = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    const displayWeek = `Week Ending ${endDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`

    const weeklyReport: WeeklyReport = {
      organizationName: orgName,
      organizationLogo: orgLogo,
      accentColor,
      weekEnding: endDateStr,
      weekRange: weekRangeDisplay,
      displayWeek,
      timezone,
      lastUpdated: new Date().toISOString(),
      userReports,
      weeklyStats: {
        totalReports,
        totalTasks,
        totalEscalations,
        averageTasksPerDay,
        submissionsByDay,
      },
      scorecard,
    }

    // Add cache headers for 5 minute caching
    const headers = new Headers()
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    headers.set("X-Robots-Tag", "noindex, nofollow")

    // Include rate limit headers on successful responses
    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    for (const [key, value] of Object.entries(rlHeaders)) {
      headers.set(key, value)
    }

    return NextResponse.json(
      { success: true, data: weeklyReport },
      { headers }
    )
  } catch (error) {
    logError(logger, "Weekly EOD report error", error)
    const response = NextResponse.json(
      { success: false, error: "Failed to load weekly report" },
      { status: 500 }
    )
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    return response
  }
}
eklyReport },
      { headers }
    )
  } catch (error) {
    logError(logger, "Weekly EOD report error", error)
    const response = NextResponse.json(
      { success: false, error: "Failed to load weekly report" },
      { status: 500 }
    )
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    return response
  }
}
