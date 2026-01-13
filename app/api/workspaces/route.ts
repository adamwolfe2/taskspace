/**
 * Workspace API Routes
 *
 * GET /api/workspaces - List user's workspaces
 * POST /api/workspaces - Create workspace (admin only)
 *
 * Part of SESSION 5: Multi-Workspace Architecture
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"
import {
  getUserWorkspaces,
  createWorkspace,
  generateSlug,
  ensureUniqueSlug,
  type Workspace,
  type WorkspaceWithMemberInfo,
  type CreateWorkspaceParams,
} from "@/lib/db/workspaces"

/**
 * GET /api/workspaces
 *
 * Returns all workspaces the current user has access to
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const workspaces = await getUserWorkspaces(auth.user.id)

    return NextResponse.json<ApiResponse<WorkspaceWithMemberInfo[]>>({
      success: true,
      data: workspaces,
    })
  } catch (error) {
    console.error("Get workspaces error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get workspaces" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/workspaces
 *
 * Creates a new workspace (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can create workspaces
    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required to create workspaces" },
        { status: 403 }
      )
    }

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

    return NextResponse.json<ApiResponse<Workspace>>({
      success: true,
      data: workspace,
      message: "Workspace created successfully",
    })
  } catch (error) {
    console.error("Create workspace error:", error)

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
}
