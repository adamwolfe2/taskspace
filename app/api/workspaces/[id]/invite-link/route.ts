/**
 * Workspace Invite Link API
 *
 * GET  /api/workspaces/[id]/invite-link  - Return existing link (auto-create if none). Admin only.
 * POST /api/workspaces/[id]/invite-link  - Regenerate link (invalidates old token). Admin only.
 */

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { getWorkspaceById } from "@/lib/db/workspaces"
import { generateInviteToken } from "@/lib/auth/password"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"

interface InviteLinkResponse {
  token: string
  url: string
}

/**
 * Verify workspace belongs to the authenticated user's organization.
 * Returns the workspace or null if not found / org mismatch.
 */
async function resolveWorkspace(id: string, orgId: string) {
  const workspace = await getWorkspaceById(id)
  if (!workspace || workspace.organizationId !== orgId) return null
  return workspace
}

/**
 * GET /api/workspaces/[id]/invite-link
 * Returns existing invite link. Auto-creates one if none exists.
 */
export const GET = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden: admin access required" },
        { status: 403 }
      )
    }

    const workspace = await resolveWorkspace(id, auth.organization.id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Fetch existing or auto-create
    let link = await db.workspaceInviteLinks.getByWorkspaceId(id)
    if (!link) {
      const token = generateInviteToken()
      link = await db.workspaceInviteLinks.upsert(id, auth.organization.id, auth.user.id, token)
    }

    return NextResponse.json<ApiResponse<InviteLinkResponse>>({
      success: true,
      data: {
        token: link.token,
        url: `${APP_URL}/join/${link.token}`,
      },
    })
  } catch (error) {
    logError(logger, "Get invite link error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get invite link" },
      { status: 500 }
    )
  }
})

/**
 * POST /api/workspaces/[id]/invite-link
 * Regenerates the invite link (UPSERTs a new token, invalidating the old one).
 */
export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Forbidden: admin access required" },
        { status: 403 }
      )
    }

    const workspace = await resolveWorkspace(id, auth.organization.id)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const token = generateInviteToken()
    const link = await db.workspaceInviteLinks.upsert(id, auth.organization.id, auth.user.id, token)

    return NextResponse.json<ApiResponse<InviteLinkResponse>>({
      success: true,
      data: {
        token: link.token,
        url: `${APP_URL}/join/${link.token}`,
      },
      message: "Invite link regenerated",
    })
  } catch (error) {
    logError(logger, "Regenerate invite link error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to regenerate invite link" },
      { status: 500 }
    )
  }
})
