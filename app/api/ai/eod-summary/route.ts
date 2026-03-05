import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { summarizePersonEOD, isClaudeConfigured } from "@/lib/ai/claude-client"
import { aiRateLimit } from "@/lib/api/rate-limit"
import type { ApiResponse } from "@/lib/types"
import { z } from "zod"
import { validateBody } from "@/lib/validation/middleware"
import { logError, logger } from "@/lib/logger"

const schema = z.object({ reportId: z.string().min(1) })

/**
 * POST /api/ai/eod-summary
 * Generate a 1-3 sentence plain-language summary of a person's EOD report
 * Admin/owner only — for the history page digest view
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features not configured" },
        { status: 503 }
      )
    }

    const isAdminOrOwner = auth.member.role === "admin" || auth.member.role === "owner"
    if (!isAdminOrOwner) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    // Rate limit: 20 AI summary calls per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'eod-summary')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { reportId } = await validateBody(request, schema)

    const report = await db.eodReports.findById(reportId)
    if (!report || report.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    const member = await db.members.findByOrgAndUser(auth.organization.id, report.userId)

    const { result } = await summarizePersonEOD(
      member?.name || "Team member",
      (report.tasks || []).map(t => ({ text: t.text, rockTitle: t.rockTitle })),
      report.challenges || "",
      report.tomorrowPriorities || []
    )

    return NextResponse.json<ApiResponse<{ summary: string }>>({
      success: true,
      data: { summary: result.summary },
    })
  } catch (error) {
    logError(logger, "EOD summary error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate summary" },
      { status: 500 }
    )
  }
})
