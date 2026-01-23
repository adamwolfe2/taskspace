/**
 * Individual Workspace API Routes
 *
 * GET /api/workspaces/[id] - Get workspace details + members
 * PATCH /api/workspaces/[id] - Update workspace (admin only)
 * DELETE /api/workspaces/[id] - Delete workspace (admin only, non-default)
 *
 * Part of SESSION 5: Multi-Workspace Architecture
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"
import {
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  userHasWorkspaceAccess,
  type Workspace,
  type WorkspaceMember,
  type UpdateWorkspaceParams,
} from "@/lib/db/workspaces"
import { logger, logError } from "@/lib/logger"

interface WorkspaceDetailResponse {
  workspace: Workspace
  members: Array<WorkspaceMember & { userName?: string; userEmail?: string }>
  memberRole: WorkspaceMember["role"] | null
}

/**
 * GET /api/workspaces/[id]
 *
 * Returns workspace details and members
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify user is in same organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check access (unless admin)
    const hasAccess = isAdmin(auth) || await userHasWorkspaceAccess(auth.user.id, id)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have access to this workspace" },
        { status: 403 }
      )
    }

    // Get members
    const members = await getWorkspaceMembers(id)

    // Get user's role in this workspace
    const userMembership = members.find((m) => m.userId === auth.user.id)
    const memberRole = userMembership?.role || null

    const response: WorkspaceDetailResponse = {
      workspace,
      members,
      memberRole,
    }

    return NextResponse.json<ApiResponse<WorkspaceDetailResponse>>({
      success: true,
      data: response,
    })
  } catch (error) {
    logError(logger, "Get workspace error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get workspace" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/workspaces/[id]
 *
 * Updates a workspace (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can update workspaces
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required to update workspaces" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get existing workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify user is in same organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, type, description, settings, isDefault } = body

    // Validation
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace name cannot be empty" },
          { status: 400 }
        )
      }
      if (name.length > 100) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace name must be 100 characters or less" },
          { status: 400 }
        )
      }
    }

    // Validate type
    const validTypes = ["leadership", "department", "team", "project"]
    if (type !== undefined && !validTypes.includes(type)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Invalid workspace type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    // Prevent un-defaulting the default workspace without setting another as default
    if (isDefault === false && workspace.isDefault) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cannot remove default status. Set another workspace as default instead." },
        { status: 400 }
      )
    }

    const updates: UpdateWorkspaceParams = {}
    if (name !== undefined) updates.name = name.trim()
    if (type !== undefined) updates.type = type
    if (description !== undefined) updates.description = description?.trim() || undefined
    if (settings !== undefined) updates.settings = settings
    if (isDefault !== undefined) updates.isDefault = isDefault

    const updatedWorkspace = await updateWorkspace(id, updates)

    if (!updatedWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to update workspace" },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<Workspace>>({
      success: true,
      data: updatedWorkspace,
      message: "Workspace updated successfully",
    })
  } catch (error) {
    logError(logger, "Update workspace error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update workspace" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/workspaces/[id]
 *
 * Deletes a workspace (admin only, cannot delete default)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can delete workspaces
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required to delete workspaces" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get existing workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify user is in same organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Cannot delete default workspace
    if (workspace.isDefault) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Cannot delete the default workspace" },
        { status: 400 }
      )
    }

    const deleted = await deleteWorkspace(id)

    if (!deleted) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to delete workspace" },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ deleted: boolean }>>({
      success: true,
      data: { deleted: true },
      message: "Workspace deleted successfully",
    })
  } catch (error) {
    logError(logger, "Delete workspace error", error)

    if (error instanceof Error && error.message.includes("default workspace")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete workspace" },
      { status: 500 }
    )
  }
}
