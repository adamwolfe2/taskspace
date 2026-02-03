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
import { logger, logError } from "@/lib/logger"

/**
 * GET /api/workspaces
 *
 * Returns all workspaces the current user has access to
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const workspaces = await getUserWorkspaces(auth.user.id)

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
    const body = await request.json()
    const { name, type, description, settings, isDefault } = body

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace name is required" },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace name must be 100 characters or less" },
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ["leadership", "department", "team", "project"]
    if (type && !validTypes.includes(type)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Invalid workspace type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
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
    }

    const workspace = await createWorkspace(params)

    // Add the creator as a workspace admin
    await addWorkspaceMember(workspace.id, auth.user.id, "admin")

    return NextResponse.json<ApiResponse<Workspace>>({
      success: true,
      data: workspace,
      message: "Workspace created successfully",
    })
  } catch (error) {
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
