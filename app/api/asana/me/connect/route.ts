import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import { db } from "@/lib/db"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

const ASANA_API_BASE = "https://app.asana.com/api/1.0"

interface AsanaWorkspace {
  gid: string
  name: string
}

/**
 * GET /api/asana/me/connect
 * Check if the current user has Asana connected (either via org mapping or personal PAT)
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

    // First check if user is mapped in org-level Asana config
    const org = await db.organizations.findById(auth.organization.id)
    const asanaConfig = org?.settings?.asanaIntegration

    let isConnectedViaOrg = false
    if (asanaConfig?.enabled && asanaConfig?.userMappings?.length > 0) {
      const userMapping = asanaConfig.userMappings.find(
        (m: any) => m.aimsUserId === auth.user.id || m.aimsUserEmail?.toLowerCase() === auth.user.email?.toLowerCase()
      )
      isConnectedViaOrg = !!userMapping && !!process.env.ASANA_ACCESS_TOKEN
    }

    // Also check member's personal PAT
    const { rows } = await sql`
      SELECT asana_pat, asana_workspace_gid, asana_last_sync_at
      FROM organization_members
      WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
    `

    const member = rows[0]
    const hasPersonalPat = !!member?.asana_pat
    const isConnected = isConnectedViaOrg || hasPersonalPat

    return NextResponse.json<ApiResponse<{
      connected: boolean
      connectedViaOrg: boolean
      connectedViaPersonal: boolean
      workspaceGid: string | null
      lastSyncAt: string | null
    }>>({
      success: true,
      data: {
        connected: isConnected,
        connectedViaOrg: isConnectedViaOrg,
        connectedViaPersonal: hasPersonalPat,
        workspaceGid: member?.asana_workspace_gid || asanaConfig?.workspaceGid || null,
        lastSyncAt: member?.asana_last_sync_at?.toISOString() || null,
      },
    })
  } catch (error) {
    logError(logger, "Check Asana connection error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to check Asana connection" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/asana/me/connect
 * Connect the current user's Asana account using their PAT
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

    const body = await request.json()
    const { personalAccessToken, workspaceGid } = body

    if (!personalAccessToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Personal Access Token is required" },
        { status: 400 }
      )
    }

    // Validate the PAT by fetching user info
    const meResponse = await fetch(`${ASANA_API_BASE}/users/me`, {
      headers: {
        Authorization: `Bearer ${personalAccessToken}`,
      },
    })

    if (!meResponse.ok) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid Asana Personal Access Token" },
        { status: 400 }
      )
    }

    const meData = await meResponse.json()
    const asanaUser = meData.data

    // Get workspaces if not provided
    let selectedWorkspaceGid = workspaceGid
    if (!selectedWorkspaceGid) {
      const workspacesResponse = await fetch(`${ASANA_API_BASE}/workspaces`, {
        headers: {
          Authorization: `Bearer ${personalAccessToken}`,
        },
      })

      if (workspacesResponse.ok) {
        const workspacesData = await workspacesResponse.json()
        const workspaces: AsanaWorkspace[] = workspacesData.data
        if (workspaces.length > 0) {
          selectedWorkspaceGid = workspaces[0].gid
        }
      }
    }

    // Store the PAT and workspace in the member record
    await sql`
      UPDATE organization_members
      SET asana_pat = ${personalAccessToken},
          asana_workspace_gid = ${selectedWorkspaceGid || null}
      WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
    `

    return NextResponse.json<ApiResponse<{
      connected: boolean
      asanaEmail: string
      asanaName: string
      workspaceGid: string | null
    }>>({
      success: true,
      data: {
        connected: true,
        asanaEmail: asanaUser.email,
        asanaName: asanaUser.name,
        workspaceGid: selectedWorkspaceGid,
      },
      message: "Asana account connected successfully",
    })
  } catch (error) {
    logError(logger, "Connect Asana error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to connect Asana account" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/asana/me/connect
 * Disconnect the current user's Asana account
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Remove Asana credentials from member record
    await sql`
      UPDATE organization_members
      SET asana_pat = NULL,
          asana_workspace_gid = NULL,
          asana_last_sync_at = NULL
      WHERE organization_id = ${auth.organization.id} AND user_id = ${auth.user.id}
    `

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Asana account disconnected",
    })
  } catch (error) {
    logError(logger, "Disconnect Asana error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to disconnect Asana account" },
      { status: 500 }
    )
  }
}
