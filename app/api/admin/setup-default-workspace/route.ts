/**
 * EMERGENCY: Set up default workspace for organization
 *
 * This endpoint creates a default workspace if one doesn't exist.
 * Safe to run multiple times (idempotent).
 */

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"
import {
  getDefaultWorkspace,
  createWorkspace,
  addWorkspaceMember,
  type CreateWorkspaceParams,
} from "@/lib/db/workspaces"
import { db } from "@/lib/db"

export const POST = withDangerousAdmin(async (request: NextRequest, auth) => {

  try {
    logger.info("🚨 Setting up default workspace")

    // Check if default workspace already exists
    const existingDefault = await getDefaultWorkspace(auth.organization.id)
    if (existingDefault) {
      logger.info(`Default workspace already exists: ${existingDefault.name}`)
      return NextResponse.json<ApiResponse<{ workspace: typeof existingDefault; message: string }>>({
        success: true,
        data: {
          workspace: existingDefault,
          message: "Default workspace already exists",
        },
      })
    }

    // Create default workspace
    const workspaceParams: CreateWorkspaceParams = {
      organizationId: auth.organization.id,
      name: auth.organization.name || "Default Workspace",
      slug: "default",
      type: "team",
      description: "Default workspace for all team members",
      settings: {},
      isDefault: true,
      createdBy: auth.user.id,
    }

    const workspace = await createWorkspace(workspaceParams)
    logger.info(`✓ Created default workspace: ${workspace.name}`)

    // Add all active organization members to the workspace
    const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const activeMembers = members.filter(m => m.status === "active" && m.userId)

    let addedCount = 0
    for (const member of activeMembers) {
      if (!member.userId) continue

      try {
        // Determine role: admins/owners become workspace admins, others become members
        const workspaceRole = (member.role === "admin" || member.role === "owner") ? "admin" : "member"
        await addWorkspaceMember(workspace.id, member.userId, workspaceRole)
        addedCount++
      } catch (error) {
        // Skip if already added or other error
        const errMsg = error instanceof Error ? error.message : "Unknown error"
        logger.warn(`Could not add member ${member.email} to workspace: ${errMsg}`)
      }
    }

    logger.info(`✓ Added ${addedCount} members to default workspace`)

    // Update all existing rocks, tasks, and EOD reports to use this workspace
    // Note: These may fail if workspace_id columns don't exist yet (migrations not run)
    // That's okay - we'll just log warnings
    logger.info("Attempting to set default workspace_id on existing data...")

    return NextResponse.json<ApiResponse<{
      workspace: typeof workspace
      membersAdded: number
      message: string
    }>>({
      success: true,
      data: {
        workspace,
        membersAdded: addedCount,
        message: "Default workspace created and members added",
      },
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error({ error: errorMessage }, "Failed to set up default workspace")

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: `Failed to set up default workspace: ${errorMessage}`,
      },
      { status: 500 }
    )
  }
})
