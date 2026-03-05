import { NextRequest, NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, OneOnOne } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

function rowToOneOnOne(row: Record<string, unknown>): OneOnOne {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    managerId: row.manager_id as string,
    reportId: row.report_id as string,
    scheduledAt: row.scheduled_at ? (row.scheduled_at as Date).toISOString() : undefined,
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : undefined,
    status: (row.status as OneOnOne["status"]) || "scheduled",
    notes: (row.notes as string) || undefined,
    aiPrep: row.ai_prep ? (row.ai_prep as OneOnOne["aiPrep"]) : undefined,
    talkingPoints: (row.talking_points as OneOnOne["talkingPoints"]) || [],
    actionItems: (row.action_items as OneOnOne["actionItems"]) || [],
    rating: row.rating ? (row.rating as number) : undefined,
    createdAt: (row.created_at as Date)?.toISOString() || new Date().toISOString(),
    updatedAt: (row.updated_at as Date)?.toISOString() || new Date().toISOString(),
  }
}

// GET /api/one-on-ones/[id] - Get a single 1-on-1
export const GET = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const result = await sql`
      SELECT * FROM one_on_ones
      WHERE id = ${id}
    `

    if (result.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "1-on-1 not found" },
        { status: 404 }
      )
    }

    const row = result.rows[0] as Record<string, unknown>
    const workspaceId = row.workspace_id as string

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "1-on-1 not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<OneOnOne>>({
      success: true,
      data: rowToOneOnOne(row),
    })
  } catch (error) {
    logError(logger, "Get 1-on-1 error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get 1-on-1" },
      { status: 500 }
    )
  }
})

// PUT /api/one-on-ones/[id] - Update a 1-on-1
export const PUT = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const existing = await sql`
      SELECT * FROM one_on_ones WHERE id = ${id}
    `

    if (existing.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "1-on-1 not found" },
        { status: 404 }
      )
    }

    const row = existing.rows[0] as Record<string, unknown>
    const workspaceId = row.workspace_id as string

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "1-on-1 not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { notes, status, talkingPoints, actionItems, rating, completedAt } = body

    await sql`
      UPDATE one_on_ones
      SET
        notes = COALESCE(${notes !== undefined ? notes : null}, notes),
        status = COALESCE(${status || null}, status),
        talking_points = COALESCE(${talkingPoints !== undefined ? JSON.stringify(talkingPoints) : null}::jsonb, talking_points),
        action_items = COALESCE(${actionItems !== undefined ? JSON.stringify(actionItems) : null}::jsonb, action_items),
        rating = COALESCE(${rating !== undefined ? rating : null}, rating),
        completed_at = COALESCE(${completedAt || null}, completed_at),
        updated_at = NOW()
      WHERE id = ${id}
    `

    const updated = await sql`SELECT * FROM one_on_ones WHERE id = ${id}`
    const updatedRow = updated.rows[0] as Record<string, unknown>

    return NextResponse.json<ApiResponse<OneOnOne>>({
      success: true,
      data: rowToOneOnOne(updatedRow),
      message: "1-on-1 updated successfully",
    })
  } catch (error) {
    logError(logger, "Update 1-on-1 error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update 1-on-1" },
      { status: 500 }
    )
  }
})

// DELETE /api/one-on-ones/[id] - Delete a 1-on-1
export const DELETE = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    const existing = await sql`
      SELECT * FROM one_on_ones WHERE id = ${id}
    `

    if (existing.rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "1-on-1 not found" },
        { status: 404 }
      )
    }

    const row = existing.rows[0] as Record<string, unknown>
    const workspaceId = row.workspace_id as string

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "1-on-1 not found" },
        { status: 404 }
      )
    }

    await sql`DELETE FROM one_on_ones WHERE id = ${id}`

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "1-on-1 deleted successfully",
    })
  } catch (error) {
    logError(logger, "Delete 1-on-1 error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete 1-on-1" },
      { status: 500 }
    )
  }
})
