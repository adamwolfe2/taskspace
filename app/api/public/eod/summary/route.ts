/**
 * Public EOD AI Summary endpoint
 *
 * Generates a 1-3 sentence plain-language summary of a person's EOD report
 * for use on the public stakeholder-facing EOD report page.
 *
 * Requires the same publicEodToken as the public EOD data endpoint.
 * IP-rate-limited: 60 req / 15 min.
 */

import { NextRequest, NextResponse } from "next/server"
import { createHash, timingSafeEqual } from "crypto"
import { sql } from "@/lib/db/sql"
import { summarizePersonEOD, isClaudeConfigured } from "@/lib/ai/claude-client"
import { enforceIpRateLimit } from "@/lib/auth/ip-rate-limit"
import { logError, logger } from "@/lib/logger"
import { z } from "zod"

const schema = z.object({
  reportId: z.string().min(1),
  slug: z.string().min(1),
  token: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "public-eod-summary", maxRequests: 60 }
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

    const { reportId, slug, token } = body

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

    // Fetch the report (verify it belongs to this org)
    const { rows: reports } = await sql`
      SELECT tasks, challenges, tomorrow_priorities, user_id
      FROM eod_reports
      WHERE id = ${reportId} AND organization_id = ${orgId}
      LIMIT 1
    `
    if (reports.length === 0) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 })
    }
    const report = reports[0]

    // Get the member's name
    const { rows: memberRows } = await sql`
      SELECT COALESCE(NULLIF(om.name, ''), u.name, 'Team member') AS name
      FROM organization_members om
      LEFT JOIN users u ON u.id = om.user_id
      WHERE om.user_id = ${report.user_id as string}
        AND om.organization_id = ${orgId}
      LIMIT 1
    `
    const memberName = memberRows[0]?.name as string || "Team member"

    const tasks = (report.tasks as Array<{ text: string; rockId?: string }>) || []
    const priorities = (report.tomorrow_priorities as Array<{ text: string }>) || []

    const { result } = await summarizePersonEOD(
      memberName,
      tasks.map(t => ({ text: t.text })),
      (report.challenges as string) || "",
      priorities
    )

    const headers = new Headers()
    headers.set("Cache-Control", "private, no-store")
    headers.set("X-Robots-Tag", "noindex, nofollow")

    return NextResponse.json({ success: true, data: { summary: result.summary } }, { headers })
  } catch (error) {
    logError(logger, "Public EOD summary error", error)
    return NextResponse.json({ success: false, error: "Failed to generate summary" }, { status: 500 })
  }
}
