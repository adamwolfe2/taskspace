/**
 * Weekly Scorecard API
 *
 * GET /api/scorecard - Get scorecard data for the organization (all members can view)
 * Query params:
 *   - weeks: number of weeks to show (default 8)
 *
 * PATCH /api/scorecard - Update a metric entry (admin only)
 * Body:
 *   - memberId: team member ID
 *   - weekEnding: date string (YYYY-MM-DD)
 *   - value: new metric value
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { getScorecardData } from "@/lib/metrics"
import { sql } from "@vercel/postgres"
import { generateId } from "@/lib/auth/password"

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // All authenticated members can view the scorecard
    const url = new URL(request.url)
    const weeksParam = url.searchParams.get("weeks")
    const weeks = weeksParam ? parseInt(weeksParam, 10) : 8

    const data = await getScorecardData(auth.organization.id, weeks)

    return NextResponse.json({
      success: true,
      data,
      isAdmin: isAdmin(auth), // Tell frontend if user can edit
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

/**
 * PATCH /api/scorecard - Update a weekly metric entry (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Only admins can edit scorecard entries
    if (!isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Admin access required to edit scorecard" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memberId, weekEnding, value } = body

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: "Member ID is required" },
        { status: 400 }
      )
    }

    if (!weekEnding) {
      return NextResponse.json(
        { success: false, error: "Week ending date is required" },
        { status: 400 }
      )
    }

    if (value === undefined || value === null || isNaN(Number(value))) {
      return NextResponse.json(
        { success: false, error: "Valid numeric value is required" },
        { status: 400 }
      )
    }

    const numericValue = Number(value)

    // Verify the member belongs to this organization
    const memberCheck = await sql`
      SELECT id FROM organization_members
      WHERE id = ${memberId} AND organization_id = ${auth.organization.id}
    `

    if (memberCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Member not found in this organization" },
        { status: 404 }
      )
    }

    // Get the active metric for this member
    const metricResult = await sql`
      SELECT id FROM team_member_metrics
      WHERE team_member_id = ${memberId} AND is_active = true
      LIMIT 1
    `

    if (metricResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active metric found for this member" },
        { status: 404 }
      )
    }

    const metricId = metricResult.rows[0].id

    // Upsert the weekly metric entry
    const result = await sql`
      INSERT INTO weekly_metric_entries (id, team_member_id, metric_id, week_ending, actual_value, created_at, updated_at)
      VALUES (
        ${'wme_' + generateId()},
        ${memberId},
        ${metricId},
        ${weekEnding}::date,
        ${numericValue},
        NOW(),
        NOW()
      )
      ON CONFLICT (team_member_id, week_ending)
      DO UPDATE SET
        actual_value = ${numericValue},
        updated_at = NOW()
      RETURNING *
    `

    return NextResponse.json({
      success: true,
      data: {
        memberId,
        weekEnding,
        value: numericValue,
      },
      message: "Scorecard entry updated successfully",
    })
  } catch (error) {
    console.error("Error updating scorecard entry:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update scorecard entry",
      },
      { status: 500 }
    )
  }
}
