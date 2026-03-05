import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
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

// GET /api/one-on-ones - List 1-on-1s for a workspace
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const managerId = searchParams.get("managerId")
    const reportId = searchParams.get("reportId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    let result
    if (managerId && reportId) {
      result = await sql`
        SELECT * FROM one_on_ones
        WHERE workspace_id = ${workspaceId}
          AND org_id = ${auth.organization.id}
          AND manager_id = ${managerId}
          AND report_id = ${reportId}
        ORDER BY scheduled_at DESC
        LIMIT 50
      `
    } else if (managerId) {
      result = await sql`
        SELECT * FROM one_on_ones
        WHERE workspace_id = ${workspaceId}
          AND org_id = ${auth.organization.id}
          AND manager_id = ${managerId}
        ORDER BY scheduled_at DESC
        LIMIT 50
      `
    } else if (reportId) {
      result = await sql`
        SELECT * FROM one_on_ones
        WHERE workspace_id = ${workspaceId}
          AND org_id = ${auth.organization.id}
          AND report_id = ${reportId}
        ORDER BY scheduled_at DESC
        LIMIT 50
      `
    } else {
      result = await sql`
        SELECT * FROM one_on_ones
        WHERE workspace_id = ${workspaceId}
          AND org_id = ${auth.organization.id}
        ORDER BY scheduled_at DESC
        LIMIT 50
      `
    }

    const oneOnOnes: OneOnOne[] = result.rows.map(row => rowToOneOnOne(row as Record<string, unknown>))

    return NextResponse.json<ApiResponse<OneOnOne[]>>({
      success: true,
      data: oneOnOnes,
    })
  } catch (error) {
    logError(logger, "List 1-on-1s error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to list 1-on-1s" },
      { status: 500 }
    )
  }
})

// POST /api/one-on-ones - Create a new 1-on-1
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const { workspaceId, managerId, reportId, scheduledAt, notes } = body

    if (!workspaceId || !managerId || !reportId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId, managerId, and reportId are required" },
        { status: 400 }
      )
    }

    const id = "ono_" + generateId()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO one_on_ones (
        id, org_id, workspace_id, manager_id, report_id,
        scheduled_at, status, notes,
        talking_points, action_items,
        created_at, updated_at
      )
      VALUES (
        ${id},
        ${auth.organization.id},
        ${workspaceId},
        ${managerId},
        ${reportId},
        ${scheduledAt || null},
        'scheduled',
        ${notes || null},
        ${JSON.stringify([])}::jsonb,
        ${JSON.stringify([])}::jsonb,
        ${now},
        ${now}
      )
    `

    const oneOnOne: OneOnOne = {
      id,
      workspaceId,
      managerId,
      reportId,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      status: "scheduled",
      notes: notes || undefined,
      talkingPoints: [],
      actionItems: [],
      createdAt: now,
      updatedAt: now,
    }

    return NextResponse.json<ApiResponse<OneOnOne>>(
      { success: true, data: oneOnOne },
      { status: 201 }
    )
  } catch (error) {
    logError(logger, "Create 1-on-1 error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create 1-on-1" },
      { status: 500 }
    )
  }
})
