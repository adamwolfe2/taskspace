import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse, Automation, AutomationAction, AutomationTriggerType } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createAutomationSchema } from "@/lib/validation/schemas"

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
// GET /api/automations?workspaceId=...
// List automations for a workspace
// ============================================

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const { rows } = await sql`
      SELECT * FROM automations
      WHERE org_id = ${auth.organization.id}
        AND workspace_id = ${workspaceId}
      ORDER BY created_at DESC
    `

    const automations = rows.map(parseAutomation)

    return NextResponse.json<ApiResponse<Automation[]>>({
      success: true,
      data: automations,
    })
  } catch (error) {
    logError(logger, "GET /api/automations error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch automations" },
      { status: 500 }
    )
  }
})

// ============================================
// POST /api/automations
// Create a new automation
// ============================================

export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const { workspaceId, name, description, triggerType, triggerConfig, actions } = await validateBody(request, createAutomationSchema)

    const id = generateId()
    const resolvedTriggerConfig = triggerConfig && typeof triggerConfig === "object" ? triggerConfig : {}
    const resolvedDescription = description && typeof description === "string" ? description : null

    const { rows } = await sql`
      INSERT INTO automations (
        id, org_id, workspace_id, name, description,
        trigger_type, trigger_config, actions, is_enabled,
        run_count, created_by, created_at, updated_at
      ) VALUES (
        ${id},
        ${auth.organization.id},
        ${workspaceId},
        ${name.trim()},
        ${resolvedDescription},
        ${triggerType},
        ${JSON.stringify(resolvedTriggerConfig)}::jsonb,
        ${JSON.stringify(actions)}::jsonb,
        ${true},
        ${0},
        ${auth.user.id},
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const automation = parseAutomation(rows[0])

    logger.info({ automationId: id, orgId: auth.organization.id, workspaceId }, "Automation created")

    return NextResponse.json<ApiResponse<Automation>>(
      { success: true, data: automation, message: "Automation created" },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "POST /api/automations error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create automation" },
      { status: 500 }
    )
  }
})
