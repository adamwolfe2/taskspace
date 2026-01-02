/**
 * Weekly Scorecard API
 *
 * GET /api/scorecard - Get scorecard data for the organization
 * Query params:
 *   - weeks: number of weeks to show (default 8)
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { getScorecardData } from "@/lib/metrics"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only admins can view the full scorecard
    if (!isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const url = new URL(request.url)
    const weeksParam = url.searchParams.get("weeks")
    const weeks = weeksParam ? parseInt(weeksParam, 10) : 8

    const data = await getScorecardData(auth.organizationId, weeks)

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Error fetching scorecard:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch scorecard",
      },
      { status: 500 }
    )
  }
}
