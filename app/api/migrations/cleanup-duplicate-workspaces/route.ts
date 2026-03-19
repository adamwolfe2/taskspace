import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/migrations/cleanup-duplicate-workspaces
 *
 * Removes duplicate "Default" workspaces per org, keeping only the one
 * marked is_default=true (or the oldest if none is marked). Migrates
 * workspace_members and data records to the surviving workspace.
 *
 * Protected by withSuperAdmin.
 */
export const POST = withSuperAdmin(async (_request: NextRequest, _auth) => {
  try {
    // Find orgs with multiple workspaces named "Default"
    const { rows: duplicateOrgs } = await sql`
      SELECT organization_id, COUNT(*) as count
      FROM workspaces
      WHERE LOWER(name) = 'default'
      GROUP BY organization_id
      HAVING COUNT(*) > 1
    `

    if (duplicateOrgs.length === 0) {
      return NextResponse.json<ApiResponse<{ cleaned: number }>>({
        success: true,
        data: { cleaned: 0 },
        message: "No duplicate Default workspaces found",
      })
    }

    const details: string[] = []
    let totalCleaned = 0

    for (const { organization_id: orgId, count } of duplicateOrgs) {
      // Get all "Default" workspaces for this org, preferring the is_default one
      const { rows: defaults } = await sql`
        SELECT id, name, is_default, created_at
        FROM workspaces
        WHERE organization_id = ${orgId} AND LOWER(name) = 'default'
        ORDER BY is_default DESC, created_at ASC
      `

      // Keep the first one (is_default=true or oldest)
      const keepId = defaults[0].id as string
      const removeIds = defaults.slice(1).map(d => d.id as string)

      for (const removeId of removeIds) {
        // Migrate workspace_members to the surviving workspace (skip duplicates)
        await sql`
          UPDATE workspace_members
          SET workspace_id = ${keepId}
          WHERE workspace_id = ${removeId}
            AND user_id NOT IN (
              SELECT user_id FROM workspace_members WHERE workspace_id = ${keepId}
            )
        `
        // Delete remaining duplicate workspace_members
        await sql`DELETE FROM workspace_members WHERE workspace_id = ${removeId}`

        // Migrate data records
        await sql`UPDATE assigned_tasks SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`
        await sql`UPDATE rocks SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`
        await sql`UPDATE eod_reports SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`
        await sql`UPDATE meetings SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`
        await sql`UPDATE focus_blocks SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`
        await sql`UPDATE daily_energy SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`
        await sql`UPDATE user_streaks SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`
        await sql`UPDATE focus_score_history SET workspace_id = ${keepId} WHERE workspace_id = ${removeId}`

        // Delete the duplicate workspace
        await sql`DELETE FROM workspaces WHERE id = ${removeId}`
        totalCleaned++
      }

      details.push(`Org ${orgId}: kept ${keepId}, removed ${removeIds.length} duplicate(s) (had ${count} total)`)
      logger.info({ orgId, keepId, removed: removeIds }, "Cleaned up duplicate Default workspaces")
    }

    return NextResponse.json<ApiResponse<{ cleaned: number; orgsAffected: number; details: string[] }>>({
      success: true,
      data: { cleaned: totalCleaned, orgsAffected: duplicateOrgs.length, details },
      message: `Removed ${totalCleaned} duplicate Default workspace(s) across ${duplicateOrgs.length} org(s)`,
    })
  } catch (error) {
    logError(logger, "cleanup-duplicate-workspaces migration error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Migration failed" },
      { status: 500 }
    )
  }
})
