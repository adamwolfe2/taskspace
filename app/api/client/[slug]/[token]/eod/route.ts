/**
 * Client Portal — EOD Reports
 *
 * GET /api/client/[slug]/[token]/eod?date=YYYY-MM-DD
 * Public, rate-limited 30/15min.
 * Returns EOD reports filtered to portal_member_filter (or all if NULL).
 */

import { NextRequest, NextResponse } from "next/server"
import { validatePortalToken } from "@/lib/auth/client-portal-auth"
import { enforceIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

interface PublicEODTask {
  description: string
  rockTitle?: string
  completedAt?: string
}

interface PublicEODPriority {
  description: string
  rockTitle?: string
}

interface PublicRockProgress {
  progress: number
  status: "on-track" | "at-risk" | "blocked" | "completed"
}

interface PortalEODReport {
  id: string
  userName: string
  userRole: "owner" | "admin" | "member"
  department: string
  jobTitle?: string
  date: string
  submittedAt: string
  tasks: PublicEODTask[]
  challenges: string
  tomorrowPriorities: PublicEODPriority[]
  needsEscalation: boolean
  escalationNote: string | null
  rocks: PublicRockProgress[]
}

interface PortalEODResponse {
  date: string
  displayDate: string
  reports: PortalEODReport[]
  submissionStats: { submitted: number; total: number; percentage: number }
}

function getQuarterFromDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z")
  const month = date.getMonth()
  const year = date.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const headers = new Headers()
  headers.set("X-Robots-Tag", "noindex, nofollow")
  headers.set("Cache-Control", "private, no-store")

  try {
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "client-portal-eod", maxRequests: 30 }
    )
    if (rateLimitResponse) return rateLimitResponse

    const { slug, token } = await params
    const auth = await validatePortalToken(slug, token)

    if ("error" in auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: auth.error },
        { status: auth.status, headers }
      )
    }

    const { client } = auth
    const orgId = client.organizationId

    const { searchParams } = new URL(request.url)
    let date = searchParams.get("date")
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = new Date().toISOString().split("T")[0]
    }

    // Get members — filtered by portal_member_filter if set
    const memberFilter = client.portalMemberFilter
    let membersQuery
    if (memberFilter && memberFilter.length > 0) {
      const filterLiteral = `{${memberFilter.join(",")}}`
      membersQuery = sql`
        SELECT om.id, om.user_id,
          COALESCE(NULLIF(om.name, ''), u.name, 'Unknown') as name,
          om.role, om.department, om.job_title, om.status
        FROM organization_members om
        LEFT JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ${orgId}
          AND om.status = 'active'
          AND om.user_id = ANY(${filterLiteral}::text[])
        ORDER BY
          CASE om.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
          COALESCE(NULLIF(om.name, ''), u.name) ASC
      `
    } else {
      membersQuery = sql`
        SELECT om.id, om.user_id,
          COALESCE(NULLIF(om.name, ''), u.name, 'Unknown') as name,
          om.role, om.department, om.job_title, om.status
        FROM organization_members om
        LEFT JOIN users u ON u.id = om.user_id
        WHERE om.organization_id = ${orgId}
          AND om.status = 'active'
        ORDER BY
          CASE om.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
          COALESCE(NULLIF(om.name, ''), u.name) ASC
      `
    }

    const { rows: members } = await membersQuery
    const memberUserIds = members.map(m => m.user_id as string)

    // Get EOD reports for this date (restricted to filtered members)
    const { rows: reports } = await sql`
      SELECT er.id, er.user_id, er.date, er.tasks, er.challenges,
        er.tomorrow_priorities, er.needs_escalation, er.escalation_note, er.submitted_at
      FROM eod_reports er
      WHERE er.organization_id = ${orgId}
        AND er.date = ${date}
      ORDER BY er.submitted_at ASC
    `

    // Get most recent quarter's rocks
    const { rows: quarterRows } = await sql`
      SELECT quarter FROM rocks
      WHERE organization_id = ${orgId} AND quarter IS NOT NULL
      ORDER BY
        SPLIT_PART(quarter, ' ', 2)::int DESC,
        SUBSTRING(quarter, 2, 1)::int DESC
      LIMIT 1
    `
    const mostRecentQuarter = quarterRows.length > 0
      ? (quarterRows[0].quarter as string)
      : getQuarterFromDate(date)

    const { rows: rocks } = await sql`
      SELECT id, title, user_id, progress, status
      FROM rocks
      WHERE organization_id = ${orgId} AND quarter = ${mostRecentQuarter}
    `
    const rockMap = new Map(rocks.map(r => [r.id as string, r.title as string]))
    const rocksByUser = new Map<string, PublicRockProgress[]>()
    for (const rock of rocks) {
      const uid = rock.user_id as string
      if (!rocksByUser.has(uid)) rocksByUser.set(uid, [])
      rocksByUser.get(uid)!.push({
        progress: (rock.progress as number) || 0,
        status: (rock.status as PublicRockProgress["status"]) || "on-track",
      })
    }

    const memberMap = new Map(members.map(m => [m.user_id as string, m]))

    // Deduplicate + merge reports per user, restricted to filtered members
    const reportsByUser = new Map<string, typeof reports>()
    for (const report of reports) {
      const uid = report.user_id as string
      if (!memberUserIds.includes(uid)) continue // filter to portal members
      if (!reportsByUser.has(uid)) reportsByUser.set(uid, [])
      reportsByUser.get(uid)!.push(report)
    }

    const portalReports: PortalEODReport[] = []
    for (const [userId, userReports] of reportsByUser) {
      const member = memberMap.get(userId)
      if (!member) continue

      const allTasks: PublicEODTask[] = []
      const seenTaskTexts = new Set<string>()
      let mergedChallenges = ""
      let latestReport = userReports[0]

      for (const report of userReports) {
        if ((report.submitted_at as string) > (latestReport.submitted_at as string)) {
          latestReport = report
        }
        const tasks = (report.tasks as Array<{ text: string; rockId?: string; completedAt?: string }>) || []
        for (const t of tasks) {
          if (!seenTaskTexts.has(t.text)) {
            seenTaskTexts.add(t.text)
            allTasks.push({
              description: t.text || "",
              rockTitle: t.rockId ? rockMap.get(t.rockId) : undefined,
              completedAt: t.completedAt,
            })
          }
        }
        const ch = (report.challenges as string) || ""
        if (ch) mergedChallenges = mergedChallenges ? mergedChallenges + "\n\n" + ch : ch
      }

      const priorities = (latestReport.tomorrow_priorities as Array<{ text: string; rockId?: string }>) || []

      portalReports.push({
        id: latestReport.id as string,
        userName: (member.name as string) || "Unknown",
        userRole: member.role as "owner" | "admin" | "member",
        department: (member.department as string) || "General",
        jobTitle: (member.job_title as string) || undefined,
        date: latestReport.date as string,
        submittedAt: latestReport.submitted_at as string,
        tasks: allTasks,
        challenges: mergedChallenges,
        tomorrowPriorities: priorities.map(p => ({
          description: p.text || "",
          rockTitle: p.rockId ? rockMap.get(p.rockId) : undefined,
        })),
        needsEscalation: (latestReport.needs_escalation as boolean) || false,
        escalationNote: latestReport.escalation_note as string | null,
        rocks: rocksByUser.get(userId) || [],
      })
    }

    portalReports.sort((a, b) => {
      const roleOrder = { owner: 1, admin: 2, member: 3 }
      const diff = (roleOrder[a.userRole] || 3) - (roleOrder[b.userRole] || 3)
      return diff !== 0 ? diff : a.userName.localeCompare(b.userName)
    })

    const filteredMemberCount = memberFilter
      ? members.filter(m => memberFilter.includes(m.user_id as string)).length
      : members.length
    const submittedCount = new Set(portalReports.map(r => r.userName)).size
    const percentage = filteredMemberCount > 0
      ? Math.round((submittedCount / filteredMemberCount) * 100)
      : 0

    const dateObj = new Date(date + "T12:00:00Z")
    const displayDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    for (const [key, value] of Object.entries(rlHeaders)) {
      headers.set(key, value)
    }

    return NextResponse.json<ApiResponse<PortalEODResponse>>(
      {
        success: true,
        data: {
          date,
          displayDate,
          reports: portalReports,
          submissionStats: {
            submitted: submittedCount,
            total: filteredMemberCount,
            percentage,
          },
        },
      },
      { headers }
    )
  } catch (error) {
    logError(logger, "Client portal EOD error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load EOD reports" },
      { status: 500, headers }
    )
  }
}
