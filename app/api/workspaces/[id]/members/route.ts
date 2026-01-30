/**
 * Workspace Members API Routes
 *
 * POST /api/workspaces/[id]/members - Add member to workspace
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
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
export async function POST(
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

    const body = await request.json()
    const { userId, role = "member" } = body

    // Validation
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User ID is required" },
        { status: 400 }
      )
    }

    const validRoles = ["owner", "admin", "member", "viewer"]
    if (!validRoles.includes(role)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      )
    }

    // Add member to workspace
    const member = await addWorkspaceMember(id, userId, role as WorkspaceMember["role"])

    return NextResponse.json<ApiResponse<WorkspaceMember>>({
      success: true,
      data: member,
      message: "Member added to workspace successfully",
    })
  } catch (error) {
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
}
