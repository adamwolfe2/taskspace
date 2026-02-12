/**
 * Force-migrate ALL data to the default workspace
 * Unlike emergency-setup which only migrates NULL workspace_id records,
 * this migrates ALL records regardless of current workspace_id value.
 */

import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"

export const POST = withAdmin(async (request: NextRequest, auth) => {
  const orgId = auth.organization.id

  // Get or create default workspace
  const { rows: workspaces } = await sql`
    SELECT id FROM workspaces
    WHERE organization_id = ${orgId}
    ORDER BY is_default DESC, created_at ASC
    LIMIT 1
  `

  if (workspaces.length === 0) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "No workspace found" },
      { status: 400 }
    )
  }

  const wsId = workspaces[0].id

  let total = 0
  const results: Record<string, number> = {}

  // Force-update ALL records to the default workspace (not just NULL ones)
  try {
    const r1 = await sql`UPDATE rocks SET workspace_id = ${wsId} WHERE organization_id = ${orgId} AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.rocks = r1.rowCount || 0
    total += results.rocks
  } catch (_e) { results.rocks_error = -1 }

  try {
    const r2 = await sql`UPDATE assigned_tasks SET workspace_id = ${wsId} WHERE organization_id = ${orgId} AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.tasks = r2.rowCount || 0
    total += results.tasks
  } catch (_e) { results.tasks_error = -1 }

  try {
    const r3 = await sql`UPDATE eod_reports SET workspace_id = ${wsId} WHERE organization_id = ${orgId} AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.eod = r3.rowCount || 0
    total += results.eod
  } catch (_e) { results.eod_error = -1 }

  try {
    const r4 = await sql`UPDATE meetings SET workspace_id = ${wsId} WHERE organization_id = ${orgId} AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.meetings = r4.rowCount || 0
    total += results.meetings
  } catch (_e) { results.meetings_error = -1 }

  // User-based tables
  try {
    const r5 = await sql`UPDATE focus_blocks SET workspace_id = ${wsId} WHERE user_id IN (SELECT user_id FROM organization_members WHERE organization_id = ${orgId}) AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.focus_blocks = r5.rowCount || 0
    total += results.focus_blocks
  } catch (_e) { results.focus_blocks_error = -1 }

  try {
    const r6 = await sql`UPDATE daily_energy SET workspace_id = ${wsId} WHERE user_id IN (SELECT user_id FROM organization_members WHERE organization_id = ${orgId}) AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.daily_energy = r6.rowCount || 0
    total += results.daily_energy
  } catch (_e) { results.daily_energy_error = -1 }

  try {
    const r7 = await sql`UPDATE user_streaks SET workspace_id = ${wsId} WHERE user_id IN (SELECT user_id FROM organization_members WHERE organization_id = ${orgId}) AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.user_streaks = r7.rowCount || 0
    total += results.user_streaks
  } catch (_e) { results.user_streaks_error = -1 }

  try {
    const r8 = await sql`UPDATE focus_score_history SET workspace_id = ${wsId} WHERE user_id IN (SELECT user_id FROM organization_members WHERE organization_id = ${orgId}) AND (workspace_id IS NULL OR workspace_id != ${wsId})`
    results.focus_score_history = r8.rowCount || 0
    total += results.focus_score_history
  } catch (_e) { results.focus_score_history_error = -1 }

  logger.info({ orgId, wsId, total, results }, "Force-migrated data to default workspace")

  return NextResponse.json<ApiResponse<{ workspaceId: string; total: number; results: Record<string, number> }>>({
    success: true,
    data: { workspaceId: wsId, total, results },
    message: `Force-migrated ${total} records to workspace ${wsId}`,
  })
})
