/**
 * EMERGENCY ENDPOINT: Direct SQL workspace creation
 *
 * This bypasses all helper functions and directly executes SQL
 * to create workspace and migrate data.
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    logger.info("🚨 FORCE WORKSPACE CREATION CALLED")

    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const orgId = auth.organization.id
    const userId = auth.user.id

    logger.info({ orgId, userId }, "Auth obtained")

    // Step 1: Check for existing workspaces
    const { rows: existingWorkspaces } = await sql`
      SELECT id, name FROM workspaces WHERE organization_id = ${orgId}
    `

    if (existingWorkspaces.length > 0) {
      logger.info({ count: existingWorkspaces.length }, "Workspace already exists")
      return NextResponse.json<ApiResponse<any>>({
        success: true,
        data: { workspace: existingWorkspaces[0], alreadyExisted: true },
        message: "Workspace already exists"
      })
    }

    // Step 2: Create workspace with direct SQL
    logger.info("Creating workspace with direct SQL")

    const workspaceId = crypto.randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO workspaces (
        id, organization_id, name, slug, type, description,
        is_default, created_by, created_at, updated_at, settings
      ) VALUES (
        ${workspaceId},
        ${orgId},
        'Default',
        'default',
        'team',
        'Default workspace for all organization members',
        true,
        ${userId},
        ${now},
        ${now},
        '{}'::jsonb
      )
    `

    logger.info({ workspaceId }, "✓ Workspace created")

    // Step 3: Add all org members to workspace
    logger.info("Adding members to workspace")

    const { rows: orgMembers } = await sql`
      SELECT user_id, role FROM organization_members WHERE organization_id = ${orgId}
    `

    logger.info({ count: orgMembers.length }, "Found org members")

    for (const member of orgMembers) {
      const memberRole = (member.role === 'owner' || member.role === 'admin') ? 'admin' : 'member'

      await sql`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
        VALUES (
          ${crypto.randomUUID()},
          ${workspaceId},
          ${member.user_id},
          ${memberRole},
          ${now}
        )
        ON CONFLICT (workspace_id, user_id) DO NOTHING
      `
    }

    logger.info("✓ Members added")

    // Step 4: Migrate all data with NULL workspace_id
    logger.info("Starting data migration")

    let migratedRecords = 0

    const tables = [
      'assigned_tasks',
      'rocks',
      'eod_reports',
      'meetings',
      'focus_blocks',
      'daily_energy',
      'user_streaks',
      'focus_score_history'
    ]

    // Org-based tables
    const tasksResult = await sql`
      UPDATE assigned_tasks SET workspace_id = ${workspaceId}
      WHERE organization_id = ${orgId} AND workspace_id IS NULL
    `
    migratedRecords += tasksResult.rowCount || 0

    const rocksResult = await sql`
      UPDATE rocks SET workspace_id = ${workspaceId}
      WHERE organization_id = ${orgId} AND workspace_id IS NULL
    `
    migratedRecords += rocksResult.rowCount || 0

    const eodResult = await sql`
      UPDATE eod_reports SET workspace_id = ${workspaceId}
      WHERE organization_id = ${orgId} AND workspace_id IS NULL
    `
    migratedRecords += eodResult.rowCount || 0

    const meetingsResult = await sql`
      UPDATE meetings SET workspace_id = ${workspaceId}
      WHERE organization_id = ${orgId} AND workspace_id IS NULL
    `
    migratedRecords += meetingsResult.rowCount || 0

    // User-based tables
    const focusBlocksResult = await sql`
      UPDATE focus_blocks SET workspace_id = ${workspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members WHERE organization_id = ${orgId}
      ) AND workspace_id IS NULL
    `
    migratedRecords += focusBlocksResult.rowCount || 0

    const energyResult = await sql`
      UPDATE daily_energy SET workspace_id = ${workspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members WHERE organization_id = ${orgId}
      ) AND workspace_id IS NULL
    `
    migratedRecords += energyResult.rowCount || 0

    const streaksResult = await sql`
      UPDATE user_streaks SET workspace_id = ${workspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members WHERE organization_id = ${orgId}
      ) AND workspace_id IS NULL
    `
    migratedRecords += streaksResult.rowCount || 0

    const focusScoreResult = await sql`
      UPDATE focus_score_history SET workspace_id = ${workspaceId}
      WHERE user_id IN (
        SELECT user_id FROM organization_members WHERE organization_id = ${orgId}
      ) AND workspace_id IS NULL
    `
    migratedRecords += focusScoreResult.rowCount || 0

    logger.info({ totalRecords: migratedRecords }, "✓ Migration complete")

    return NextResponse.json<ApiResponse<{
      workspaceId: string
      membersAdded: number
      recordsMigrated: number
    }>>({
      success: true,
      data: {
        workspaceId,
        membersAdded: orgMembers.length,
        recordsMigrated: migratedRecords
      },
      message: `SUCCESS! Created workspace and migrated ${migratedRecords} records`
    })

  } catch (error) {
    logError(logger, "🚨 FORCE WORKSPACE CREATION FAILED", error)

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : ""

    logger.error({
      message: errorMessage,
      stack: errorStack
    }, "Full error details")

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: `Database error: ${errorMessage}`
      },
      { status: 500 }
    )
  }
}
