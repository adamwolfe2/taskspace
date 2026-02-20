/**
 * Admin endpoint to look up user account status by email
 * Used for debugging login issues — shows lockout state, membership, etc.
 */

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"

export const POST = withDangerousAdmin(async (request: NextRequest, auth) => {
  const { email } = await request.json()

  if (!email || typeof email !== "string") {
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Email is required" },
      { status: 400 }
    )
  }

  // Look up user by email (case-insensitive)
  const { rows: userRows } = await sql`
    SELECT id, email, name, email_verified, last_login_at,
           failed_login_attempts, locked_at, lock_reason,
           created_at, updated_at, is_super_admin
    FROM users
    WHERE LOWER(email) = LOWER(${email})
  `

  // Also check organization_members for this email (draft members, org-specific emails)
  const { rows: memberRows } = await sql`
    SELECT om.id, om.organization_id, om.user_id, om.email, om.name, om.role, om.status,
           om.department, om.joined_at,
           o.name as org_name
    FROM organization_members om
    JOIN organizations o ON o.id = om.organization_id
    WHERE LOWER(om.email) = LOWER(${email})
  `

  // Check for any invitations for this email
  const { rows: invitationRows } = await sql`
    SELECT id, organization_id, email, status, expires_at, created_at
    FROM invitations
    WHERE LOWER(email) = LOWER(${email})
    ORDER BY created_at DESC
    LIMIT 5
  `

  // Check for any sessions if user exists
  let sessionRows: { id: string; organization_id: string; expires_at: string; created_at: string; last_active_at: string }[] = []
  if (userRows.length > 0) {
    const result = await sql<{ id: string; organization_id: string; expires_at: string; created_at: string; last_active_at: string }>`
      SELECT id, organization_id, expires_at, created_at, last_active_at
      FROM sessions
      WHERE user_id = ${userRows[0].id}
      ORDER BY last_active_at DESC
      LIMIT 5
    `
    sessionRows = result.rows
  }

  // Also check if there's a user found by org-member user_id (for org-specific emails)
  let linkedUser = null
  if (userRows.length === 0 && memberRows.length > 0) {
    const memberWithUser = memberRows.find((m) => (m as Record<string, unknown>).user_id)
    if (memberWithUser) {
      const { rows: linkedUserRows } = await sql`
        SELECT id, email, name, failed_login_attempts, locked_at, lock_reason, last_login_at
        FROM users
        WHERE id = ${memberWithUser.user_id}
      `
      linkedUser = linkedUserRows[0] || null
    }
  }

  // Count all locked users in the org for context
  const { rows: lockedCountRows } = await sql`
    SELECT COUNT(*) as count
    FROM users u
    JOIN organization_members om ON om.user_id = u.id
    WHERE om.organization_id = ${auth.organization.id}
      AND u.locked_at IS NOT NULL
  `

  return NextResponse.json<ApiResponse<unknown>>({
    success: true,
    data: {
      userFound: userRows.length > 0,
      user: userRows[0] || null,
      linkedUser,
      memberships: memberRows,
      recentInvitations: invitationRows,
      recentSessions: sessionRows,
      orgLockedUsersCount: parseInt(lockedCountRows[0]?.count || "0", 10),
    },
  })
})
