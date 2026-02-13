import { NextRequest, NextResponse } from "next/server"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { sql } from "@/lib/db/sql"
import { db } from "@/lib/db"
import { generateId } from "@/lib/auth/password"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { encryptToken, decryptToken } from "@/lib/crypto/token-encryption"
import { withAuth } from "@/lib/api/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { asanaConnectSchema } from "@/lib/validation/schemas"

const ASANA_API_BASE = "https://app.asana.com/api/1.0"

interface AsanaWorkspace {
  gid: string
  name: string
}

/**
 * GET /api/asana/me/connect
 * Check if the current user has Asana connected for a specific workspace
 */
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    // workspaceId is optional - workspace feature temporarily disabled
    const workspaceId = searchParams.get("workspaceId")

    // Check for workspace-specific Asana connection
    const { rows } = await sql`
      SELECT personal_access_token, asana_workspace_gid, last_sync_at, sync_enabled
      FROM asana_connections
      WHERE user_id = ${auth.user.id} AND workspace_id = ${workspaceId}
    `

    const connection = rows[0]
    const isConnected = !!connection

    return NextResponse.json<ApiResponse<{
      connected: boolean
      workspaceGid: string | null
      lastSyncAt: string | null
      syncEnabled: boolean
    }>>({
      success: true,
      data: {
        connected: isConnected,
        workspaceGid: connection?.asana_workspace_gid || null,
        lastSyncAt: connection?.last_sync_at?.toISOString() || null,
        syncEnabled: connection?.sync_enabled || false,
      },
    })
  } catch (error) {
    logError(logger, "Check Asana connection error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to check Asana connection" },
      { status: 500 }
    )
  }
})

/**
 * POST /api/asana/me/connect
 * Connect the current user's Asana account for a specific workspace
 */
export const POST = withAuth(async (request, auth) => {
  try {
    const { personalAccessToken, workspaceGid, aimsWorkspaceId } = await validateBody(request, asanaConnectSchema)

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

    // Encrypt the PAT before storing in database
    const encryptedPAT = encryptToken(personalAccessToken)

    // Store the encrypted PAT and workspace in the asana_connections table
    const connectionId = generateId()
    await sql`
      INSERT INTO asana_connections (
        id,
        organization_id,
        workspace_id,
        user_id,
        personal_access_token,
        asana_workspace_gid,
        sync_enabled,
        created_at,
        updated_at
      ) VALUES (
        ${connectionId},
        ${auth.organization.id},
        ${aimsWorkspaceId},
        ${auth.user.id},
        ${encryptedPAT},
        ${selectedWorkspaceGid || null},
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (user_id, workspace_id) DO UPDATE SET
        personal_access_token = ${encryptedPAT},
        asana_workspace_gid = ${selectedWorkspaceGid || null},
        updated_at = NOW()
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
        workspaceGid: selectedWorkspaceGid || null,
      },
      message: "Asana account connected successfully for this workspace",
    })
  } catch (error) {
    logError(logger, "Connect Asana error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to connect Asana account" },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/asana/me/connect
 * Disconnect the current user's Asana account for a specific workspace
 */
export const DELETE = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Validate workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
          { status: 404 }
      )
    }

    // Remove Asana connection for this workspace
    await sql`
      DELETE FROM asana_connections
      WHERE user_id = ${auth.user.id} AND workspace_id = ${workspaceId}
    `

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Asana account disconnected from this workspace",
    })
  } catch (error) {
    logError(logger, "Disconnect Asana error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to disconnect Asana account" },
      { status: 500 }
    )
  }
})
