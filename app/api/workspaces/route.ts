/**
 * Workspace API Routes
 *
 * GET /api/workspaces - List user's workspaces
 * POST /api/workspaces - Create workspace (admin only)
 *
 * Part of SESSION 5: Multi-Workspace Architecture
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, withAdmin } from "@/lib/api/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createWorkspaceSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import {
  getUserWorkspaces,
  createWorkspace,
  generateSlug,
  ensureUniqueSlug,
  addWorkspaceMember,
  type Workspace,
  type WorkspaceWithMemberInfo,
  type CreateWorkspaceParams,
} from "@/lib/db/workspaces"
import { canCreateWorkspace, buildFeatureGateContext } from "@/lib/billing/feature-gates"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"

/**
 * GET /api/workspaces
 *
 * Returns all workspaces the current user has access to
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    let workspaces = await getUserWorkspaces(auth.user.id, auth.organization.id)

    // Auto-heal: ensure org member is in ALL org workspaces they should have access to
    try {
      const { getWorkspacesByOrg } = await import("@/lib/db/workspaces")
      const allOrgWorkspaces = await getWorkspacesByOrg(auth.organization.id)

      if (allOrgWorkspaces.length > 0) {
        const userWorkspaceIds = new Set(workspaces.map((w) => w.id))
        const missingWorkspaces = allOrgWorkspaces.filter((w) => !userWorkspaceIds.has(w.id))

        if (missingWorkspaces.length > 0) {
          const memberRole = auth.member.role === "owner" || auth.member.role === "admin" ? "admin" : "member"
          await Promise.allSettled(
            missingWorkspaces.map((w) => addWorkspaceMember(w.id, auth.user.id, memberRole))
          )

          // Re-fetch workspaces now that user has been added to missing ones
          workspaces = await getUserWorkspaces(auth.user.id, auth.organization.id)

          logger.info({
            userId: auth.user.id,
            organizationId: auth.organization.id,
            addedToWorkspaces: missingWorkspaces.map((w) => w.id),
          }, "Auto-healed: added org member to missing workspaces")
        }
      }
    } catch (healError) {
      logError(logger, "Auto-heal workspace membership failed (non-fatal)", healError)
    }

    // Auto-heal: check for orphaned data with NULL workspace_id and migrate it
    if (workspaces.length > 0) {
      const defaultWorkspace = workspaces.find((w) => w.isDefault) || workspaces[0]

      try {
        // Quick check: are there any orphaned records for this org?
        const orphanCheck = await sql`
          SELECT EXISTS(
            SELECT 1 FROM assigned_tasks
            WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
            LIMIT 1
          ) AS has_orphaned_tasks,
          EXISTS(
            SELECT 1 FROM rocks
            WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
            LIMIT 1
          ) AS has_orphaned_rocks,
          EXISTS(
            SELECT 1 FROM eod_reports
            WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
            LIMIT 1
          ) AS has_orphaned_eod
        `

        const row = orphanCheck.rows[0]
        const hasOrphans = row?.has_orphaned_tasks || row?.has_orphaned_rocks || row?.has_orphaned_eod

        if (hasOrphans) {
          const targetId = defaultWorkspace.id

          // Migrate all orphaned org-based records
          await sql`
            UPDATE assigned_tasks SET workspace_id = ${targetId}
            WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          `
          await sql`
            UPDATE rocks SET workspace_id = ${targetId}
            WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          `
          await sql`
            UPDATE eod_reports SET workspace_id = ${targetId}
            WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          `
          await sql`
            UPDATE meetings SET workspace_id = ${targetId}
            WHERE organization_id = ${auth.organization.id} AND workspace_id IS NULL
          `

          // Migrate user-based records
          await sql`
            UPDATE focus_blocks SET workspace_id = ${targetId}
            WHERE user_id IN (
              SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
            ) AND workspace_id IS NULL
          `
          await sql`
            UPDATE daily_energy SET workspace_id = ${targetId}
            WHERE user_id IN (
              SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
            ) AND workspace_id IS NULL
          `
          await sql`
            UPDATE user_streaks SET workspace_id = ${targetId}
            WHERE user_id IN (
              SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
            ) AND workspace_id IS NULL
          `
          await sql`
            UPDATE focus_score_history SET workspace_id = ${targetId}
            WHERE user_id IN (
              SELECT user_id FROM organization_members WHERE organization_id = ${auth.organization.id}
            ) AND workspace_id IS NULL
          `

          logger.info({
            organizationId: auth.organization.id,
            workspaceId: targetId,
          }, "Auto-healed orphaned data during workspace list fetch")
        }
      } catch (healError) {
        // Non-fatal: log but don't fail the workspace list request
        logError(logger, "Auto-heal check failed (non-fatal)", healError)
      }
    }

    return NextResponse.json<ApiResponse<WorkspaceWithMemberInfo[]>>({
      success: true,
      data: workspaces,
    })
  } catch (error) {
    logError(logger, "Get workspaces error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get workspaces" },
      { status: 500 }
    )
  }
})

/**
 * POST /api/workspaces
 *
 * Creates a new workspace (admin only)
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { name, type, description, settings, isDefault, logoUrl, primaryColor, secondaryColor, accentColor, faviconUrl } = await validateBody(request, createWorkspaceSchema)

    // Check feature gate: Can create workspace?
    const allWorkspaces = await getUserWorkspaces(auth.user.id, auth.organization.id)
    const activeMembers = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const featureContext = await buildFeatureGateContext(
      auth.organization.id,
      auth.organization.subscription,
      {
        activeUsers: activeMembers.filter(m => m.status === "active").length,
        workspaces: allWorkspaces.length,
      },
      auth.organization.isInternal
    )

    const workspaceCheck = canCreateWorkspace(featureContext)
    if (!workspaceCheck.allowed) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: workspaceCheck.reason || "Cannot create workspace",
          meta: {
            upgradeRequired: workspaceCheck.upgradeRequired,
          },
        },
        { status: 403 }
      )
    }

    // Generate unique slug
    const baseSlug = generateSlug(name.trim())
    const slug = await ensureUniqueSlug(auth.organization.id, baseSlug)

    // Create workspace
    const params: CreateWorkspaceParams = {
      organizationId: auth.organization.id,
      name: name.trim(),
      slug,
      type: type || "team",
      description: description?.trim() || undefined,
      settings: settings || {},
      isDefault: isDefault || false,
      createdBy: auth.user.id,
      logoUrl: logoUrl || null,
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      accentColor: accentColor || null,
      faviconUrl: faviconUrl || null,
    }

    const workspace = await createWorkspace(params)

    // Add the creator as a workspace admin
    await addWorkspaceMember(workspace.id, auth.user.id, "admin")

    // Add all other active org members to the new workspace so they have immediate access
    try {
      const allOrgMembers = await db.members.findWithUsersByOrganizationId(auth.organization.id)
      const otherActiveMembers = allOrgMembers.filter(
        (m) => m.status === "active" && m.userId && m.userId !== auth.user.id
      )
      await Promise.allSettled(
        otherActiveMembers.map((m) =>
          addWorkspaceMember(workspace.id, m.userId!, "member")
        )
      )
    } catch (err) {
      logError(logger, "Failed to add org members to new workspace (non-fatal)", err)
    }

    return NextResponse.json<ApiResponse<Workspace>>({
      success: true,
      data: workspace,
      message: "Workspace created successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Create workspace error", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("unique")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "A workspace with this name already exists" },
        { status: 409 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create workspace" },
      { status: 500 }
    )
  }
})
