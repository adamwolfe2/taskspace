import { NextRequest, NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, Automation, AutomationAction, AutomationTriggerType } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateAutomationSchema } from "@/lib/validation/schemas"

// ============================================
// ROW PARSER
// ============================================

function parseAutomation(row: Record<string, unknown>): Automation {
  return {
    id: row.id as string,
    orgId: row.org_id as string,
    workspaceId: row.workspace_id as string,
    name: row.name as string,
    description: (row.description as string) || undefined,
    triggerType: row.trigger_type as AutomationTriggerType,
    triggerConfig: (row.trigger_config as Record<string, unknown>) || {},
    actions: (row.actions as AutomationAction[]) || [],
    isEnabled: row.is_enabled as boolean,
    runCount: (row.run_count as number) || 0,
    lastRunAt: row.last_run_at ? (row.last_run_at as Date).toISOString() : undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

// ============================================
// GET /api/automations/[id]
// ============================================

export const GET = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const id = params?.id

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation ID is required" },
        { status: 400 }
      )
    }

    const { rows } = await sql`
      SELECT * FROM automations
      WHERE id = ${id}
        AND org_id = ${auth.organization.id}
    `

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<Automation>>({
      success: true,
      data: parseAutomation(rows[0]),
    })
  } catch (error) {
    logError(logger, "GET /api/automations/[id] error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch automation" },
      { status: 500 }
    )
  }
})

// ============================================
// PUT /api/automations/[id]
// Update name, description, triggerType, triggerConfig, actions, isEnabled
// ============================================

export const PUT = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const id = params?.id

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation ID is required" },
        { status: 400 }
      )
    }

    // Verify automation belongs to this org
    const { rows: existing } = await sql`
      SELECT id FROM automations WHERE id = ${id} AND org_id = ${auth.organization.id}
    `
    if (existing.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation not found" },
        { status: 404 }
      )
    }

    const { name, description, triggerType, triggerConfig, actions, isEnabled } = await validateBody(request, updateAutomationSchema)

    const { rows } = await sql`
      UPDATE automations
      SET
        name          = COALESCE(${name !== undefined ? name.trim() : null}, name),
        description   = CASE WHEN ${description !== undefined} THEN ${description ?? null} ELSE description END,
        trigger_type  = COALESCE(${triggerType ?? null}, trigger_type),
        trigger_config = CASE WHEN ${triggerConfig !== undefined} THEN ${JSON.stringify(triggerConfig ?? {})}::jsonb ELSE trigger_config END,
        actions       = CASE WHEN ${actions !== undefined} THEN ${JSON.stringify(actions ?? [])}::jsonb ELSE actions END,
        is_enabled    = COALESCE(${isEnabled !== undefined ? isEnabled : null}, is_enabled),
        updated_at    = NOW()
      WHERE id = ${id} AND org_id = ${auth.organization.id}
      RETURNING *
    `

    if (rows.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation not found" },
        { status: 404 }
      )
    }

    logger.info({ automationId: id, orgId: auth.organization.id }, "Automation updated")

    return NextResponse.json<ApiResponse<Automation>>({
      success: true,
      data: parseAutomation(rows[0]),
      message: "Automation updated",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "PUT /api/automations/[id] error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update automation" },
      { status: 500 }
    )
  }
})

// ============================================
// DELETE /api/automations/[id]
// ============================================

export const DELETE = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const id = params?.id

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation ID is required" },
        { status: 400 }
      )
    }

    const { rowCount } = await sql`
      DELETE FROM automations
      WHERE id = ${id}
        AND org_id = ${auth.organization.id}
    `

    if ((rowCount ?? 0) === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation not found" },
        { status: 404 }
      )
    }

    logger.info({ automationId: id, orgId: auth.organization.id }, "Automation deleted")

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Automation deleted",
    })
  } catch (error) {
    logError(logger, "DELETE /api/automations/[id] error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete automation" },
      { status: 500 }
    )
  }
})
