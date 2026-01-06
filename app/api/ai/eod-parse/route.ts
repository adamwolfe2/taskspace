import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { parseEODTextDump, isClaudeConfigured, ParsedEODReport } from "@/lib/ai/claude-client"
import type { ApiResponse } from "@/lib/types"

// Get current quarter string
function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

// POST /api/ai/eod-parse - Parse text dump into EOD report structure
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Admin only feature
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can use the AI EOD parser" },
        { status: 403 }
      )
    }

    if (!isClaudeConfigured()) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "AI features are not configured. Please add ANTHROPIC_API_KEY to environment." },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { content, quarter } = body

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Text dump content is required" },
        { status: 400 }
      )
    }

    // Use provided quarter or default to current
    const targetQuarter = quarter || getCurrentQuarter()

    // Get user's rocks for context
    const allRocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id)

    // Parse the text dump
    const parsedReport = await parseEODTextDump(
      content.trim(),
      allRocks,
      targetQuarter
    )

    // Return the parsed structure for review before submission
    return NextResponse.json<ApiResponse<{
      parsed: ParsedEODReport
      quarter: string
      rockCount: number
    }>>({
      success: true,
      data: {
        parsed: parsedReport,
        quarter: targetQuarter,
        rockCount: allRocks.filter(r => r.quarter === targetQuarter).length,
      },
      message: `Parsed ${parsedReport.tasks.length} tasks from your text dump`,
    })
  } catch (error) {
    console.error("EOD text parse error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: error instanceof Error ? error.message : "Failed to parse EOD text" },
      { status: 500 }
    )
  }
}
