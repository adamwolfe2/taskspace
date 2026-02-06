/**
 * Workspace Members API Routes
 *
 * POST /api/workspaces/[id]/members - Add member to workspace
 */

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { addWorkspaceMemberSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import {
  getWorkspaceById,
  addWorkspaceMember,
  userHasWorkspaceAccess,
  type WorkspaceMember,
} from "@/lib/db/workspaces"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/workspaces/[id]/members
 * Add a member to the workspace
 */
export const POST = withAuth(async (request, auth, context?) => {
  try {
    const { id } = await context!.params

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

    const { userId, role } = await validateBody(request, addWorkspaceMemberSchema)

    // Add member to workspace
    const member = await addWorkspaceMember(id, userId, role as WorkspaceMember["role"])

    return NextResponse.json<ApiResponse<WorkspaceMember>>({
      success: true,
      data: member,
      message: "Member added to workspace successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Add workspace member error", error)

    // Handle duplicate member
    if (error instanceof Error && error.message.includes("duplicate")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User is already a member of this workspace" },
        { status: 409 }
      )
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to add member to workspace" },
      { status: 500 }
    )
  }
})
