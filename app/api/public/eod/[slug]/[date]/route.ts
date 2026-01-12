/**
 * Public EOD Daily Report API
 *
 * This endpoint provides public access to aggregated EOD reports for a specific date.
 * No authentication required - designed for sharing with stakeholders/board members.
 *
 * URL format: /api/public/eod/[org-slug]/[date]
 * Example: /api/public/eod/aims/2026-01-05
 */

import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"

interface PublicEODTask {
  description: string
  rockTitle?: string
  completedAt?: string
}

interface PublicEODPriority {
  description: string
  rockTitle?: string
}

// Rock progress for bento cards
interface PublicRockProgress {
  id: string
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
    const { slug, date } = await params

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      )
    }

    // Find organization by slug
    const { rows: orgs } = await sql`
      SELECT id, name, settings
      FROM organizations
      WHERE slug = ${slug}
    `

    if (orgs.length === 0) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    const org = orgs[0]
    const orgId = org.id as string
    const orgName = org.name as string
    const settings = org.settings as { timezone?: string; customBranding?: { logo?: string } } | null
    const timezone = settings?.timezone || "America/Los_Angeles"
    const orgLogo = settings?.customBranding?.logo

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
    // Filter by current quarter based on report date
    const currentQuarter = getQuarterFromDate(date)
    const { rows: rocks } = await sql`
      SELECT id, title, user_id, progress, status
      FROM rocks
      WHERE organization_id = ${orgId}
        AND quarter = ${currentQuarter}
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

    // Build the public report data
    const memberMap = new Map(members.map(m => [m.user_id as string, m]))

    const publicReports: PublicEODReport[] = []

    // First add reports from owners/admins, then members
    const sortedReports = reports.sort((a, b) => {
      const memberA = memberMap.get(a.user_id as string)
      const memberB = memberMap.get(b.user_id as string)

      const roleOrder = { owner: 1, admin: 2, member: 3 }
      const roleA = roleOrder[(memberA?.role as keyof typeof roleOrder) || "member"]
      const roleB = roleOrder[(memberB?.role as keyof typeof roleOrder) || "member"]

      if (roleA !== roleB) return roleA - roleB

      // Within same role, sort by name
      const nameA = (memberA?.name as string) || ""
      const nameB = (memberB?.name as string) || ""
      return nameA.localeCompare(nameB)
    })

    for (const report of sortedReports) {
      const member = memberMap.get(report.user_id as string)
      if (!member) continue // Skip if member not found

      // EOD tasks use 'text' field, priorities use 'text' field as well
      const tasks = (report.tasks as Array<{ text: string; rockId?: string; completedAt?: string }>) || []
      const priorities = (report.tomorrow_priorities as Array<{ text: string; rockId?: string }>) || []

      const userId = report.user_id as string
      publicReports.push({
        userName: (member.name as string) || "Unknown",
        userRole: member.role as "owner" | "admin" | "member",
        department: (member.department as string) || "General",
        jobTitle: member.job_title as string || undefined,
        date: report.date as string,
        submittedAt: report.submitted_at as string,
        tasks: tasks.map(t => ({
          description: t.text || "",
          rockTitle: t.rockId ? rockMap.get(t.rockId) : undefined,
          completedAt: t.completedAt,
        })),
        challenges: (report.challenges as string) || "",
        tomorrowPriorities: priorities.map(p => ({
          description: p.text || "",
          rockTitle: p.rockId ? rockMap.get(p.rockId) : undefined,
        })),
        needsEscalation: report.needs_escalation as boolean || false,
        escalationNote: report.escalation_note as string | null,
        rocks: rocksByUser.get(userId) || [],
      })
    }

    // Calculate submission stats
    const activeMembers = members.filter(m => m.status === "active")
    const submittedCount = publicReports.length
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

    // Add cache headers for 30 second caching
    const headers = new Headers()
    headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60")

    return NextResponse.json(
      { success: true, data: dailyReport },
      { headers }
    )
  } catch (error) {
    console.error("Public EOD report error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load daily report" },
      { status: 500 }
    )
  }
}
