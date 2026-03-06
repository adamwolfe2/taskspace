import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { isEmailConfigured, sendOnboardingDripEmail } from "@/lib/integrations/email"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Runs daily at 2 PM UTC — configured in vercel.json
// Sends onboarding drip emails at Day 1, Day 3, and Day 7 after org creation

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const isProduction = process.env.NODE_ENV === "production"

  if (!cronSecret) {
    if (isProduction) {
      logger.error("CRON_SECRET not configured in production - denying request")
      return false
    }
    logger.info("CRON_SECRET not configured, allowing request in development")
    return true
  }

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isEmailConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Email not configured" },
        { status: 503 }
      )
    }

    logger.info({ timestamp: new Date().toISOString() }, "Running onboarding drip cron")

    const results: { orgId: string; orgName: string; day: number; status: string }[] = []

    // ----------------------------------------------------------------
    // Day 1: orgs created 23–25h ago with 0 EOD reports submitted
    // ----------------------------------------------------------------
    const { rows: day1Orgs } = await sql<{
      id: string
      name: string
      owner_email: string
      owner_name: string
    }>`
      SELECT o.id, o.name, u.email AS owner_email, u.name AS owner_name
      FROM organizations o
      JOIN users u ON u.id = o.owner_id
      WHERE o.created_at > NOW() - INTERVAL '25 hours'
        AND o.created_at <= NOW() - INTERVAL '23 hours'
        AND NOT EXISTS (
          SELECT 1 FROM eod_reports er WHERE er.organization_id = o.id
        )
    `

    for (const org of day1Orgs) {
      try {
        await sendOnboardingDripEmail({
          to: org.owner_email,
          name: org.owner_name,
          orgName: org.name,
          day: 1,
        })
        logger.info({ orgId: org.id, day: 1 }, "Day 1 drip sent")
        results.push({ orgId: org.id, orgName: org.name, day: 1, status: "sent" })
      } catch (e) {
        logError(logger, `Day 1 drip failed for org ${org.id}`, e)
        results.push({ orgId: org.id, orgName: org.name, day: 1, status: "error" })
      }
    }

    // ----------------------------------------------------------------
    // Day 3: orgs created 71–73h ago with fewer than 2 members
    // ----------------------------------------------------------------
    const { rows: day3Orgs } = await sql<{
      id: string
      name: string
      owner_email: string
      owner_name: string
      member_count: number
    }>`
      SELECT o.id, o.name, u.email AS owner_email, u.name AS owner_name,
             COUNT(om.id)::int AS member_count
      FROM organizations o
      JOIN users u ON u.id = o.owner_id
      LEFT JOIN organization_members om ON om.organization_id = o.id AND om.status = 'active'
      WHERE o.created_at > NOW() - INTERVAL '73 hours'
        AND o.created_at <= NOW() - INTERVAL '71 hours'
      GROUP BY o.id, o.name, u.email, u.name
      HAVING COUNT(om.id) < 2
    `

    for (const org of day3Orgs) {
      try {
        await sendOnboardingDripEmail({
          to: org.owner_email,
          name: org.owner_name,
          orgName: org.name,
          day: 3,
        })
        logger.info({ orgId: org.id, day: 3 }, "Day 3 drip sent")
        results.push({ orgId: org.id, orgName: org.name, day: 3, status: "sent" })
      } catch (e) {
        logError(logger, `Day 3 drip failed for org ${org.id}`, e)
        results.push({ orgId: org.id, orgName: org.name, day: 3, status: "error" })
      }
    }

    // ----------------------------------------------------------------
    // Day 7: orgs created 167–169h ago with 0 rocks
    // ----------------------------------------------------------------
    const { rows: day7Orgs } = await sql<{
      id: string
      name: string
      owner_email: string
      owner_name: string
    }>`
      SELECT o.id, o.name, u.email AS owner_email, u.name AS owner_name
      FROM organizations o
      JOIN users u ON u.id = o.owner_id
      WHERE o.created_at > NOW() - INTERVAL '169 hours'
        AND o.created_at <= NOW() - INTERVAL '167 hours'
        AND NOT EXISTS (
          SELECT 1 FROM rocks r WHERE r.organization_id = o.id
        )
    `

    for (const org of day7Orgs) {
      try {
        await sendOnboardingDripEmail({
          to: org.owner_email,
          name: org.owner_name,
          orgName: org.name,
          day: 7,
        })
        logger.info({ orgId: org.id, day: 7 }, "Day 7 drip sent")
        results.push({ orgId: org.id, orgName: org.name, day: 7, status: "sent" })
      } catch (e) {
        logError(logger, `Day 7 drip failed for org ${org.id}`, e)
        results.push({ orgId: org.id, orgName: org.name, day: 7, status: "error" })
      }
    }

    const sent = results.filter(r => r.status === "sent").length
    return NextResponse.json<ApiResponse<{ results: typeof results }>>({
      success: true,
      data: { results },
      message: `Sent ${sent} onboarding drip emails (${day1Orgs.length} day-1, ${day3Orgs.length} day-3, ${day7Orgs.length} day-7 orgs)`,
    })
  } catch (error) {
    logError(logger, "Onboarding drip cron error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to run onboarding drip cron" },
      { status: 500 }
    )
  }
}
