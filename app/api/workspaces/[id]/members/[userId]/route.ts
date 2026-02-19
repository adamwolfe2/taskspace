/**
 * Individual Workspace Member API Routes
 *
 * PATCH /api/workspaces/[id]/members/[userId] - Update member role
 * DELETE /api/workspaces/[id]/members/[userId] - Remove member from workspace
 */

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"

import { isAdmin } from "@/lib/auth/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateWorkspaceMemberRoleSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import {
  getWorkspaceById,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  userHasWorkspaceAccess,
  getWorkspaceMembers,
  type WorkspaceMember,
} from "@/lib/db/workspaces"
import { logger, logError } from "@/lib/logger"

/**
 * PATCH /api/workspaces/[id]/members/[userId]
 * Update a workspace member's role
 */
export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id, userId } = await context.params

    // Get workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify workspace is in same organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check if user is admin of workspace or org admin
    const isWorkspaceAdmin = await userHasWorkspaceAccess(auth.user.id, id, "admin")
    if (!isWorkspaceAdmin && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const { role } = await validateBody(request, updateWorkspaceMemberRoleSchema)

    // Update member role
    const member = await updateWorkspaceMemberRole(id, userId, role as WorkspaceMember["role"])

    if (!member) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found in workspace" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<WorkspaceMember>>({
      success: true,
      data: member,
      message: "Member role updated successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Update workspace member role error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update member role" },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/workspaces/[id]/members/[userId]
 * Remove a member from the workspace
 */
export const DELETE = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id, userId } = await context.params

    // Get workspace
    const workspace = await getWorkspaceById(id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Verify workspace is in same organization
    if (workspace.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check if user is admin of workspace or org admin
    const isWorkspaceAdmin = await userHasWorkspaceAccess(auth.user.id, id, "admin")
    if (!isWorkspaceAdmin && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    // Prevent removing yourself if you're the last admin
    if (userId === auth.user.id) {
      const members = await getWorkspaceMembers(id)
      const admins = members.filter((m) => m.role === "admin" || m.role === "owner")
      if (admins.length === 1) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Cannot remove the last admin from the workspace" },
          { status: 400 }
        )
      }
    }

    // Remove member from workspace
    const removed = await removeWorkspaceMember(id, userId)

    if (!removed) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Member not found in workspace" },
        { status: 404 }
      )
    }

    return NextResponse.json<ApiResponse<{ removed: boolean }>>({
      success: true,
      data: { removed: true },
      message: "Member removed from workspace successfully",
    })
  } catch (error) {
    logError(logger, "Remove workspace member error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to remove member from workspace" },
      { status: 500 }
    )
  }
})
