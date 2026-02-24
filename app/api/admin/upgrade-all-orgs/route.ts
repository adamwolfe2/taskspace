import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/admin/upgrade-all-orgs
 *
 * One-shot endpoint: finds every organization where the super admin
 * (SUPER_ADMIN_EMAIL) is a member and sets is_internal = true on all of them.
 * Only callable by the super admin themselves.
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.toLowerCase()

  if (!superAdminEmail) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "SUPER_ADMIN_EMAIL is not configured" },
      { status: 500 }
    )
  }

  if (auth.user.email.toLowerCase() !== superAdminEmail) {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Forbidden" },
      { status: 403 }
    )
  }

  try {
    // Find all orgs where the super admin is an active member
    const { rows: orgRows } = await sql<{ org_id: string; org_name: string }>`
      SELECT DISTINCT om.organization_id AS org_id, o.name AS org_name
      FROM organization_members om
      JOIN users u ON u.id = om.user_id
      JOIN organizations o ON o.id = om.organization_id
      WHERE LOWER(u.email) = ${superAdminEmail}
        AND om.status = 'active'
        AND o.archived_at IS NULL
    `

    if (orgRows.length === 0) {
      return NextResponse.json<ApiResponse<{ upgraded: number; orgs: string[] }>>({
        success: true,
        data: { upgraded: 0, orgs: [] },
        message: "No orgs found where you are an active member",
      })
    }

    const orgIds = orgRows.map(r => r.org_id)
    const orgNames = orgRows.map(r => r.org_name)

    // Bulk update all of them to is_internal = true
    const idList = orgIds.join("','")
    await sql`
      UPDATE organizations
      SET is_internal = true, updated_at = NOW()
      WHERE id = ANY(${`{${idList}}`}::text[])
    `

    logger.info({ orgIds, count: orgIds.length }, "Super admin bulk-upgraded all orgs to enterprise")

    return NextResponse.json<ApiResponse<{ upgraded: number; orgs: string[] }>>({
      success: true,
      data: { upgraded: orgIds.length, orgs: orgNames },
      message: `Upgraded ${orgIds.length} organization(s) to enterprise`,
    })
  } catch (error) {
    logError(logger, "Upgrade all orgs error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to upgrade orgs" },
      { status: 500 }
    )
  }
})
