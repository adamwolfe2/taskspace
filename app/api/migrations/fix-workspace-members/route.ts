import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import { addWorkspaceMember, getDefaultWorkspace, getWorkspacesByOrg } from "@/lib/db/workspaces"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/migrations/fix-workspace-members
 *
 * Finds all org members who are missing from workspace_members table
 * and adds them to the default workspace for their org.
 *
 * Protected by withSuperAdmin.
 */
export const POST = withSuperAdmin(async (request: NextRequest, auth) => {
  try {
    // Find org members who have NO workspace membership
    const { rows: orphanedMembers } = await sql`
      SELECT om.user_id, om.organization_id, om.role, om.email
      FROM organization_members om
      WHERE om.user_id IS NOT NULL
        AND om.status = 'active'
        AND NOT EXISTS (
          SELECT 1 FROM workspace_members wm WHERE wm.user_id = om.user_id
        )
    `

    if (orphanedMembers.length === 0) {
      return NextResponse.json<ApiResponse<{ fixed: number; details: string[] }>>({
        success: true,
        data: { fixed: 0, details: ["All org members have workspace memberships"] },
      })
    }

    const details: string[] = []
    let fixed = 0

    for (const member of orphanedMembers) {
      try {
        // Find workspace to add them to
        let targetWorkspace = await getDefaultWorkspace(member.organization_id)
        if (!targetWorkspace) {
          const orgWorkspaces = await getWorkspacesByOrg(member.organization_id)
          targetWorkspace = orgWorkspaces[0] || null
        }

        if (!targetWorkspace) {
          details.push(`SKIP: No workspace found for org ${member.organization_id} (user: ${member.email})`)
          continue
        }

        const role = member.role === "owner" || member.role === "admin" ? "admin" : "member"
        await addWorkspaceMember(targetWorkspace.id, member.user_id, role)
        fixed++
        details.push(`FIXED: ${member.email} → workspace ${targetWorkspace.id} (${targetWorkspace.name}) as ${role}`)

        logger.info({
          userId: member.user_id,
          email: member.email,
          organizationId: member.organization_id,
          workspaceId: targetWorkspace.id,
        }, "Fixed missing workspace membership")
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        details.push(`ERROR: ${member.email} — ${msg}`)
        logError(logger, `Failed to fix workspace membership for ${member.email}`, err)
      }
    }

    return NextResponse.json<ApiResponse<{ fixed: number; total: number; details: string[] }>>({
      success: true,
      data: { fixed, total: orphanedMembers.length, details },
      message: `Fixed ${fixed} of ${orphanedMembers.length} orphaned members`,
    })
  } catch (error) {
    logError(logger, "fix-workspace-members migration error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Migration failed" },
      { status: 500 }
    )
  }
})
