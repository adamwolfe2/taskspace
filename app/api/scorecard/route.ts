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

import { NextResponse } from "next/server"
import { isAdmin } from "@/lib/auth/middleware"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { isFeatureEnabled, getFeatureGateError } from "@/lib/auth/feature-gate"
import { userHasWorkspaceAccess, getWorkspaceMembers } from "@/lib/db/workspaces"
import { getScorecardData } from "@/lib/metrics"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import { logger, logError } from "@/lib/logger"
import { safeParseInt, clamp } from "@/lib/utils"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateScorecardEntrySchema } from "@/lib/validation/schemas"

export const GET = withAuth(async (request, auth) => {
  try {
    if (!isFeatureEnabled(auth.organization, "scorecard")) {
      return getFeatureGateError("scorecard")
    }

    const url = new URL(request.url)
    const workspaceId = url.searchParams.get("workspaceId")

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Validate workspace access (unless org admin)
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: "Workspace not found" },
          { status: 404 }
        )
      }
    }

    // All authenticated workspace members can view the scorecard
    const weeksParam = url.searchParams.get("weeks")
    const weeks = clamp(safeParseInt(weeksParam, 8), 1, 52)

    // Get org-wide data then filter by workspace
    const data = await getScorecardData(auth.organization.id, weeks)

    // Filter rows to only workspace members
    const workspaceMembers = await getWorkspaceMembers(workspaceId)
    const workspaceMemberIds = new Set(workspaceMembers.map(wm => wm.id))
    const filteredRows = data.rows.filter(row => workspaceMemberIds.has(row.memberId))

    return NextResponse.json({
      success: true,
      data: {
        weeks: data.weeks,
        rows: filteredRows,
      },
      isAdmin: isAdmin(auth), // Tell frontend if user can edit
    })
  } catch (error) {
    logError(logger, "Error fetching scorecard", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch scorecard",
      },
      { status: 500 }
    )
  }
})

/**
 * PATCH /api/scorecard - Update a weekly metric entry (admin only)
 */
export const PATCH = withAuth(async (request, auth) => {
  try {
    if (!isFeatureEnabled(auth.organization, "scorecard")) {
      return getFeatureGateError("scorecard")
    }

    // Only admins can edit scorecard entries
    if (!isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Admin access required to edit scorecard" },
        { status: 403 }
      )
    }

    // Validate request body using Zod schema
    const body = await validateBody(
      request,
      updateScorecardEntrySchema,
      { errorPrefix: "Invalid scorecard entry" }
    )
    const { memberId, weekEnding, value: numericValue, workspaceId } = body

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

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

    // CRITICAL: Verify the member is in the specified workspace
    const workspaceMembers = await getWorkspaceMembers(workspaceId)
    const workspaceMemberIds = new Set(workspaceMembers.map(wm => wm.id))
    if (!workspaceMemberIds.has(memberId)) {
      return NextResponse.json(
        { success: false, error: "Member not found in this workspace" },
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

    const metricId = metricResult.rows[0]?.id

    // Upsert the weekly metric entry
    await sql`
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
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Error updating scorecard entry", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update scorecard entry",
      },
      { status: 500 }
    )
  }
})
