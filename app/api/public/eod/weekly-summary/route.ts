/**
 * Public Weekly EOD AI Summary endpoint
 *
 * Generates a 1-3 sentence summary of a team member's weekly EOD data.
 * Used on the public weekly report page for both overview bento cards
 * and detail cards.
 *
 * Requires the same publicEodToken as the public EOD data endpoint.
 * IP-rate-limited: 60 req / 15 min.
 */

import { NextRequest, NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { sql } from "@/lib/db/sql"
import { summarizeWeeklyPersonEOD, isClaudeConfigured } from "@/lib/ai/claude-client"
import { enforceIpRateLimit } from "@/lib/auth/ip-rate-limit"
import { logError, logger } from "@/lib/logger"
import { z } from "zod"

const schema = z.object({
  slug: z.string().min(1),
  token: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  userName: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "public-eod-weekly-summary", maxRequests: 60 }
    )
    if (rateLimitResponse) return rateLimitResponse

    if (!isClaudeConfigured()) {
      return NextResponse.json({ success: false, error: "AI not available" }, { status: 503 })
    }

    let body: z.infer<typeof schema>
    try {
      body = schema.parse(await request.json())
    } catch {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
    }

    const { slug, token, date, userName } = body

    // Verify the org exists and the token matches
    const { rows: orgs } = await sql`
      SELECT id, settings FROM organizations WHERE slug = ${slug} LIMIT 1
    `
    if (orgs.length === 0) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
    }
    const settings = orgs[0].settings as { publicEodToken?: string } | null
    if (!settings?.publicEodToken) {
      return NextResponse.json({ success: false, error: "Public access not configured" }, { status: 403 })
    }
    const hashToken = (t: string) => createHash("sha256").update(t).digest()
    if (!timingSafeEqual(hashToken(token), hashToken(settings.publicEodToken))) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 })
    }

    const orgId = orgs[0].id as string

    // Calculate week range (Thursday date -> Friday-Thursday)
    const endDate = new Date(date + "T12:00:00Z")
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6)

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = date

    // Find the user by name within this org
    const { rows: memberRows } = await sql`
      SELECT om.user_id
      FROM organization_members om
      LEFT JOIN users u ON u.id = om.user_id
      WHERE om.organization_id = ${orgId}
        AND om.status = 'active'
        AND COALESCE(NULLIF(om.name, ''), u.name) = ${userName}
      LIMIT 1
    `

    if (memberRows.length === 0) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    const userId = memberRows[0].user_id as string

    // Fetch all EOD reports for this user for the week
    const { rows: reports } = await sql`
      SELECT tasks, challenges, tomorrow_priorities, needs_escalation, escalation_note
      FROM eod_reports
      WHERE organization_id = ${orgId}
        AND user_id = ${userId}
        AND date >= ${startDateStr}
        AND date <= ${endDateStr}
      ORDER BY date ASC
    `

    // Get rocks for context
    const { rows: rocks } = await sql`
      SELECT id, title
      FROM rocks
      WHERE organization_id = ${orgId}
        AND user_id = ${userId}
    `
    const rockMap = new Map(rocks.map(r => [r.id as string, r.title as string]))

    // Aggregate all tasks, challenges, priorities, and escalations
    const allTasks: Array<{ text: string; rockTitle?: string | null }> = []
    const allChallenges: string[] = []
    const allPriorities: Array<{ text: string }> = []
    const allEscalations: Array<{ note: string }> = []

    for (const report of reports) {
      const tasks = (report.tasks as Array<{ text: string; rockId?: string }>) || []
      for (const task of tasks) {
        if (task.text) {
          allTasks.push({
            text: task.text,
            rockTitle: task.rockId ? rockMap.get(task.rockId) : undefined,
          })
        }
      }

      const challenges = report.challenges as string
      if (challenges && challenges.trim()) {
        allChallenges.push(challenges.trim())
      }

      const priorities = (report.tomorrow_priorities as Array<{ text: string }>) || []
      for (const p of priorities) {
        if (p.text) allPriorities.push({ text: p.text })
      }

      if (report.needs_escalation && report.escalation_note) {
        allEscalations.push({ note: report.escalation_note as string })
      }
    }

    const { result } = await summarizeWeeklyPersonEOD(
      userName,
      allTasks,
      allChallenges,
      allPriorities,
      allEscalations,
      reports.length
    )

    const headers = new Headers()
    headers.set("Cache-Control", "private, no-store")
    headers.set("X-Robots-Tag", "noindex, nofollow")

    return NextResponse.json({ success: true, data: { summary: result.summary } }, { headers })
  } catch (error) {
    logError(logger, "Weekly summary error", error)
    return NextResponse.json({ success: false, error: "Failed to generate summary" }, { status: 500 })
  }
}
