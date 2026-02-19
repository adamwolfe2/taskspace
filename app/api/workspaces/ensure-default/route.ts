/**
 * Ensure Default Workspace API
 *
 * CRITICAL FIX: Creates a default workspace for organizations that don't have one.
 * This handles legacy users who signed up before workspace implementation.
 */

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export const POST = withAuth(async (request, auth) => {
  try {
    logger.info("Ensure default workspace called")

    logger.info({ userId: auth.user.id, orgId: auth.organization.id }, "Auth context obtained")

    // Check if organization already has a default workspace
    logger.info("Checking for existing workspaces")
    const existingWorkspaces = await db.workspaces.findByOrganizationId(auth.organization.id)
    logger.info({ count: existingWorkspaces.length }, "Existing workspaces found")

    if (existingWorkspaces.length > 0) {
      // Organization already has workspaces
      const defaultWorkspace = existingWorkspaces.find(w => w.isDefault) || existingWorkspaces[0]
      const targetWorkspaceId = String(defaultWorkspace.id)

      // Auto-heal: ensure current user is a workspace member
      try {
        const { rows: existingMembership } = await sql`
          SELECT 1 FROM workspace_members
          WHERE workspace_id = ${targetWorkspaceId} AND user_id = ${auth.user.id}
          LIMIT 1
        `
        if (existingMembership.length === 0) {
          const memberRole = auth.member.role === "owner" || auth.member.role === "admin" ? "admin" : "member"
          await db.workspaceMembers.create({
            id: generateId(),
            workspaceId: targetWorkspaceId,
            userId: auth.user.id,
            role: memberRole,
            joinedAt: new Date().toISOString(),
          })
          logger.info({
            userId: auth.user.id,
            workspaceId: targetWorkspaceId,
          }, "Auto-healed: added missing workspace membership for org member")
        }
      } catch (memberHealError) {
        logError(logger, "Failed to auto-heal workspace membership (non-fatal)", memberHealError)
      }

      // Auto-heal: migrate any orphaned data with NULL workspace_id
      let healedRecords = 0
      try {
        const tasksResult = await sql`
          UPDATE assigned_tasks SET workspace_id = ${targetWorkspaceId}
          WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += tasksResult.rows.length

        const rocksResult = await sql`
          UPDATE rocks SET workspace_id = ${targetWorkspaceId}
          WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += rocksResult.rows.length

        const eodResult = await sql`
          UPDATE eod_reports SET workspace_id = ${targetWorkspaceId}
          WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += eodResult.rows.length

        const meetingsResult = await sql`
          UPDATE meetings SET workspace_id = ${targetWorkspaceId}
          WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += meetingsResult.rows.length

        const focusBlocksResult = await sql`
          UPDATE focus_blocks SET workspace_id = ${targetWorkspaceId}
          WHERE user_id IN (
            SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
          ) AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += focusBlocksResult.rows.length

        const energyResult = await sql`
          UPDATE daily_energy SET workspace_id = ${targetWorkspaceId}
          WHERE user_id IN (
            SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
          ) AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += energyResult.rows.length

        const streaksResult = await sql`
          UPDATE user_streaks SET workspace_id = ${targetWorkspaceId}
          WHERE user_id IN (
            SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
          ) AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += streaksResult.rows.length

        const focusScoreResult = await sql`
          UPDATE focus_score_history SET workspace_id = ${targetWorkspaceId}
          WHERE user_id IN (
            SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
          ) AND workspace_id IS NULL
          RETURNING id
        `
        healedRecords += focusScoreResult.rows.length

        if (healedRecords > 0) {
          logger.info({
            organizationId: auth.organization.id,
            workspaceId: targetWorkspaceId,
            recordCount: healedRecords,
          }, "Auto-healed orphaned data with NULL workspace_id")
        }
      } catch (healError) {
        logger.error({
          error: healError,
          workspaceId: targetWorkspaceId,
        }, "Auto-heal migration failed (non-fatal)")
      }

      return NextResponse.json<ApiResponse<{ workspace: typeof defaultWorkspace; dataHealed: number }>>({
        success: true,
        data: { workspace: defaultWorkspace, dataHealed: healedRecords },
        message: healedRecords > 0
          ? `Organization already has workspaces. Auto-healed ${healedRecords} orphaned records.`
          : "Organization already has workspaces",
      })
    }

    // Create default workspace for organization
    logger.info("Creating default workspace")
    const now = new Date().toISOString()
    const defaultWorkspaceId = generateId()
    const defaultWorkspace = {
      id: defaultWorkspaceId,
      organizationId: auth.organization.id,
      name: "Default",
      slug: "default",
      type: "team" as const,
      description: "Default workspace for all organization members",
      isDefault: true,
      createdBy: auth.user.id,
      createdAt: now,
      updatedAt: now,
      settings: {},
    }

    logger.info({ workspaceId: defaultWorkspaceId }, "About to insert workspace")
    await db.workspaces.create(defaultWorkspace)
    logger.info("Workspace created successfully")

    // Add current user to the default workspace as admin
    const workspaceMember = {
      id: generateId(),
      workspaceId: defaultWorkspaceId,
      userId: auth.user.id,
      role: auth.member.role === "owner" ? ("admin" as const) : ("member" as const),
      joinedAt: now,
    }

    await db.workspaceMembers.create(workspaceMember)

    // Add all existing organization members to the default workspace
    const allMembers = await db.members.findByOrganizationId(auth.organization.id)

    for (const member of allMembers) {
      // Skip if already added (current user) or if userId is null
      if (!member.userId || member.userId === auth.user.id) continue

      const memberRole = member.role === "owner" || member.role === "admin" ? "admin" : "member"
      await db.workspaceMembers.create({
        id: generateId(),
        workspaceId: defaultWorkspaceId,
        userId: member.userId,
        role: memberRole,
        joinedAt: now,
      })
    }

    logger.info({
      organizationId: auth.organization.id,
      workspaceId: defaultWorkspaceId,
      memberCount: allMembers.length,
    }, "Created default workspace for organization")

    // CRITICAL: Migrate existing data to this workspace
    let migratedRecords = 0
    try {
      // Migrate all existing data with NULL workspace_id to the default workspace

      // Org-based tables
      const tasksResult = await sql`
        UPDATE assigned_tasks SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += tasksResult.rows.length

      const rocksResult = await sql`
        UPDATE rocks SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += rocksResult.rows.length

      const eodResult = await sql`
        UPDATE eod_reports SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += eodResult.rows.length

      const meetingsResult = await sql`
        UPDATE meetings SET workspace_id = ${defaultWorkspaceId}
        WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += meetingsResult.rows.length

      // User-based tables (productivity features)
      const focusBlocksResult = await sql`
        UPDATE focus_blocks SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += focusBlocksResult.rows.length

      const energyResult = await sql`
        UPDATE daily_energy SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += energyResult.rows.length

      const streaksResult = await sql`
        UPDATE user_streaks SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += streaksResult.rows.length

      const focusScoreResult = await sql`
        UPDATE focus_score_history SET workspace_id = ${defaultWorkspaceId}
        WHERE user_id IN (
          SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
        ) AND workspace_id IS NULL
        RETURNING id
      `
      migratedRecords += focusScoreResult.rows.length

      if (migratedRecords > 0) {
        logger.info({
          organizationId: auth.organization.id,
          workspaceId: defaultWorkspaceId,
          recordCount: migratedRecords,
        }, "Migrated existing data to default workspace")
      }
    } catch (migrationError) {
      logger.error({
        error: migrationError,
        workspaceId: defaultWorkspaceId,
      }, "Data migration failed but workspace created")
    }

    return NextResponse.json<ApiResponse<{
      workspace: typeof defaultWorkspace
      membersAdded: number
      dataMigrated: number
    }>>({
      success: true,
      data: {
        workspace: defaultWorkspace,
        membersAdded: allMembers.length,
        dataMigrated: migratedRecords,
      },
      message: `Default workspace created successfully${migratedRecords > 0 ? ` and ${migratedRecords} records migrated` : ""}`,
    })
  } catch (error) {
    logError(logger, "Ensure default workspace error", error)

    // Return detailed error for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : ""

    logger.error({
      message: errorMessage,
      stack: errorStack,
      error: JSON.stringify(error, null, 2)
    }, "Detailed error info")

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Operation failed"
      },
      { status: 500 }
    )
  }
})
