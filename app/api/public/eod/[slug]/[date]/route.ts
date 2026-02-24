/**
 * Public EOD Daily Report API
 *
 * Token-protected endpoint for sharing EOD reports with external stakeholders.
 * Requires a valid publicEodToken configured in organization settings.
 *
 * SECURITY:
 * - Access token REQUIRED — orgs must configure publicEodToken in settings
 * - IP-based rate limiting (30 req / 15 min)
 * - No internal IDs or emails exposed in response
 * - Cache-Control: private, no-store
 *
 * URL format: /api/public/eod/[org-slug]/[date]?token=<publicEodToken>
 * Example: /api/public/eod/aims/2026-01-05?token=abc123
 */

import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual, createHash } from "crypto"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import { enforceIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"

interface PublicEODTask {
  description: string
  rockTitle?: string
  completedAt?: string
}

interface PublicEODPriority {
  description: string
  rockTitle?: string
}

// Rock progress for bento cards (no internal IDs exposed)
interface PublicRockProgress {
  progress: number
  status: "on-track" | "at-risk" | "blocked" | "completed"
}

// Helper to calculate quarter from date (e.g., "2026-01-05" -> "Q1 2026")
function getQuarterFromDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00Z")
  const month = date.getMonth() // 0-11
  const year = date.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

interface PublicEODReport {
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
  // New fields for bento cards
  rocks: PublicRockProgress[]
}

interface PublicDailyReport {
  organizationName: string
  organizationLogo?: string
  accentColor?: string | null
  date: string
  displayDate: string
  timezone: string
  lastUpdated: string
  reports: PublicEODReport[]
  submissionStats: {
    submitted: number
    total: number
    percentage: number
  }
}

// GET /api/public/eod/[slug]/[date] - Get all EOD reports for a date
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; date: string }> }
) {
  try {
    // IP-based rate limiting: 30 requests per IP per 15 minutes
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "public-eod-daily", maxRequests: 30 }
    )
    if (rateLimitResponse) return rateLimitResponse

    const { slug, date } = await params

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const response = NextResponse.json(
        { success: false, error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      )
      response.headers.set("X-Robots-Tag", "noindex, nofollow")
      return response
    }

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

    // Access token protection for public EOD endpoints
    // Token is REQUIRED — org must configure publicEodToken in settings
    const { searchParams } = new URL(request.url)
    const providedToken = searchParams.get("token")
    if (!settings?.publicEodToken) {
      // No token configured — public EOD access is disabled by default
      const response = NextResponse.json(
        { success: false, error: "Public EOD access is not configured for this organization" },
        { status: 403 }
      )
      response.headers.set("X-Robots-Tag", "noindex, nofollow")
      return response
    }
    // Hash both tokens before comparison so timingSafeEqual can't leak token length
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

    logger.info({ orgSlug: slug, date }, "Public EOD accessed")

    // Get accent color from the org's default workspace (or first workspace)
    const { rows: wsRows } = await sql`
      SELECT accent_color
      FROM workspaces
      WHERE organization_id = ${orgId}
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1
    `
    const accentColor = wsRows.length > 0 ? (wsRows[0].accent_color as string | null) : null

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

    // Get EOD reports for this date
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
        er.submitted_at,
        er.created_at
      FROM eod_reports er
      WHERE er.organization_id = ${orgId}
        AND er.date = ${date}
      ORDER BY er.submitted_at ASC
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
    const mostRecentQuarter = quarterRows.length > 0 ? quarterRows[0].quarter as string : getQuarterFromDate(date)

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
        progress: (rock.progress as number) || 0,
        status: (rock.status as PublicRockProgress["status"]) || "on-track",
      })
    }

    // Build the public report data
    const memberMap = new Map(members.map(m => [m.user_id as string, m]))

    // Deduplicate reports by user_id: merge multiple same-day reports into one
    const reportsByUser = new Map<string, typeof reports>()
    for (const report of reports) {
      const userId = report.user_id as string
      if (!reportsByUser.has(userId)) {
        reportsByUser.set(userId, [])
      }
      reportsByUser.get(userId)!.push(report)
    }

    const publicReports: PublicEODReport[] = []

    for (const [userId, userReports] of reportsByUser) {
      const member = memberMap.get(userId)
      if (!member) continue // Skip if member not found

      // Merge all reports for this user: combine tasks, use latest for other fields
      const allTasks: PublicEODTask[] = []
      const seenTaskTexts = new Set<string>()
      let mergedChallenges = ""
      let latestReport = userReports[0]

      for (const report of userReports) {
        // Track latest by submitted_at
        if ((report.submitted_at as string) > (latestReport.submitted_at as string)) {
          latestReport = report
        }

        // Merge tasks (deduplicate by text)
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

        // Merge challenges
        const challenges = (report.challenges as string) || ""
        if (challenges) {
          mergedChallenges = mergedChallenges
            ? mergedChallenges + "\n\n" + challenges
            : challenges
        }
      }

      // Use latest report for priorities, escalation, and submittedAt
      const priorities = (latestReport.tomorrow_priorities as Array<{ text: string; rockId?: string }>) || []

      publicReports.push({
        userName: (member.name as string) || "Unknown",
        userRole: member.role as "owner" | "admin" | "member",
        department: (member.department as string) || "General",
        jobTitle: member.job_title as string || undefined,
        date: latestReport.date as string,
        submittedAt: latestReport.submitted_at as string,
        tasks: allTasks,
        challenges: mergedChallenges,
        tomorrowPriorities: priorities.map(p => ({
          description: p.text || "",
          rockTitle: p.rockId ? rockMap.get(p.rockId) : undefined,
        })),
        needsEscalation: latestReport.needs_escalation as boolean || false,
        escalationNote: latestReport.escalation_note as string | null,
        rocks: rocksByUser.get(userId) || [],
      })
    }

    // Sort by role priority then name
    publicReports.sort((a, b) => {
      const roleOrder = { owner: 1, admin: 2, member: 3 }
      const roleA = roleOrder[a.userRole] || 3
      const roleB = roleOrder[b.userRole] || 3
      if (roleA !== roleB) return roleA - roleB
      return a.userName.localeCompare(b.userName)
    })

    // Calculate submission stats
    // Count unique users who have submitted (a user might submit multiple reports per day)
    const activeMembers = members.filter(m => m.status === "active")
    const uniqueSubmitters = new Set(publicReports.map(r => r.userName))
    const submittedCount = uniqueSubmitters.size
    const totalCount = activeMembers.length
    const percentage = totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0

    // Format display date
    const dateObj = new Date(date + "T12:00:00Z")
    const displayDate = dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const dailyReport: PublicDailyReport = {
      organizationName: orgName,
      organizationLogo: orgLogo,
      accentColor,
      date,
      displayDate,
      timezone,
      lastUpdated: new Date().toISOString(),
      reports: publicReports,
      submissionStats: {
        submitted: submittedCount,
        total: totalCount,
        percentage,
      },
    }

    // Private cache — this data requires a token and should not be stored in shared caches
    const headers = new Headers()
    headers.set("Cache-Control", "private, no-store")
    headers.set("X-Robots-Tag", "noindex, nofollow")

    // Include rate limit headers on successful responses
    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    for (const [key, value] of Object.entries(rlHeaders)) {
      headers.set(key, value)
    }

    return NextResponse.json(
      { success: true, data: dailyReport },
      { headers }
    )
  } catch (error) {
    logError(logger, "Public EOD report error", error)
    const response = NextResponse.json(
      { success: false, error: "Failed to load daily report" },
      { status: 500 }
    )
    response.headers.set("X-Robots-Tag", "noindex, nofollow")
    return response
  }
}
