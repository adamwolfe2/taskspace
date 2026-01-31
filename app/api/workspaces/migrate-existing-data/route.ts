/**
 * Migrate Existing Data to Default Workspace
 *
 * CRITICAL FIX: Assigns all existing data (with NULL workspace_id) to the default workspace.
 * This handles legacy data created before workspace implementation.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can run migrations
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can migrate data" },
        { status: 403 }
      )
    }

    // Get default workspace for this organization
    const { rows: workspaces } = await sql`
      SELECT id FROM workspaces
      WHERE organization_id = ${auth.organization.id}
      ORDER BY is_default DESC, created_at ASC
      LIMIT 1
    `

    if (workspaces.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No workspace found. Please create a workspace first." },
        { status: 400 }
      )
    }

    const defaultWorkspaceId = workspaces[0].id

    // Migrate all data with NULL workspace_id to the default workspace
    const migrations = []

    // 1. Migrate tasks
    const tasksResult = await sql`
      UPDATE assigned_tasks
      SET workspace_id = ${defaultWorkspaceId}
      WHERE organization_id = ${auth.organization.id}
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "assigned_tasks", count: tasksResult.rows.length })

    // 2. Migrate rocks
    const rocksResult = await sql`
      UPDATE rocks
      SET workspace_id = ${defaultWorkspaceId}
      WHERE organization_id = ${auth.organization.id}
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "rocks", count: rocksResult.rows.length })

    // 3. Migrate EOD reports
    const eodResult = await sql`
      UPDATE eod_reports
      SET workspace_id = ${defaultWorkspaceId}
      WHERE organization_id = ${auth.organization.id}
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "eod_reports", count: eodResult.rows.length })

    // 4. Migrate meetings
    const meetingsResult = await sql`
      UPDATE meetings
      SET workspace_id = ${defaultWorkspaceId}
      WHERE organization_id = ${auth.organization.id}
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "meetings", count: meetingsResult.rows.length })

    // 5. Migrate focus blocks
    const focusBlocksResult = await sql`
      UPDATE focus_blocks
      SET workspace_id = ${defaultWorkspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = ${auth.organization.id}
      )
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "focus_blocks", count: focusBlocksResult.rows.length })

    // 6. Migrate daily energy
    const energyResult = await sql`
      UPDATE daily_energy
      SET workspace_id = ${defaultWorkspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = ${auth.organization.id}
      )
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "daily_energy", count: energyResult.rows.length })

    // 7. Migrate user streaks
    const streaksResult = await sql`
      UPDATE user_streaks
      SET workspace_id = ${defaultWorkspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = ${auth.organization.id}
      )
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "user_streaks", count: streaksResult.rows.length })

    // 8. Migrate focus score history
    const focusScoreResult = await sql`
      UPDATE focus_score_history
      SET workspace_id = ${defaultWorkspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members
        WHERE organization_id = ${auth.organization.id}
      )
      AND workspace_id IS NULL
      RETURNING id
    `
    migrations.push({ table: "focus_score_history", count: focusScoreResult.rows.length })

    const totalMigrated = migrations.reduce((sum, m) => sum + m.count, 0)

    logger.info("Migrated existing data to default workspace", {
      organizationId: auth.organization.id,
      workspaceId: defaultWorkspaceId,
      migrations,
      totalRecords: totalMigrated,
    })

    return NextResponse.json<ApiResponse<{
      workspaceId: string
      migrations: typeof migrations
      totalRecords: number
    }>>({
      success: true,
      data: {
        workspaceId: defaultWorkspaceId,
        migrations,
        totalRecords: totalMigrated,
      },
      message: `Successfully migrated ${totalMigrated} records to default workspace`,
    })
  } catch (error) {
    logError(logger, "Migrate existing data error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to migrate data" },
      { status: 500 }
    )
  }
}
