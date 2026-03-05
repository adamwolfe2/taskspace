import { NextRequest, NextResponse } from "next/server"
import { withAuth, type RouteContext } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse, AutomationLog } from "@/lib/types"
import { logError, logger } from "@/lib/logger"

// ============================================
// ROW PARSER
// ============================================

function parseAutomationLog(row: Record<string, unknown>): AutomationLog {
  return {
    id: row.id as string,
    automationId: row.automation_id as string,
    triggerEvent: (row.trigger_event as Record<string, unknown>) || {},
    actionsExecuted: (row.actions_executed as Record<string, unknown>) || {},
    status: row.status as AutomationLog["status"],
    error: (row.error as string) || undefined,
    executedAt: (row.executed_at as Date)?.toISOString() || "",
  }
}

// ============================================
// GET /api/automations/[id]/logs
// Return the last 50 execution logs for an automation
// ============================================

export const GET = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  try {
    const params = await context?.params
    const automationId = params?.id

    if (!automationId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation ID is required" },
        { status: 400 }
      )
    }

    // Verify the automation belongs to this org
    const { rows: ownerCheck } = await sql`
      SELECT id FROM automations
      WHERE id = ${automationId}
        AND org_id = ${auth.organization.id}
    `

    if (ownerCheck.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Automation not found" },
        { status: 404 }
      )
    }

    const { rows } = await sql`
      SELECT * FROM automation_logs
      WHERE automation_id = ${automationId}
      ORDER BY executed_at DESC
      LIMIT 50
    `

    const logs = rows.map(parseAutomationLog)

    return NextResponse.json<ApiResponse<AutomationLog[]>>({
      success: true,
      data: logs,
    })
  } catch (error) {
    logError(logger, "GET /api/automations/[id]/logs error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch automation logs" },
      { status: 500 }
    )
  }
})
