import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withSuperAdmin } from "@/lib/api/middleware"
import { generateId, generateInviteToken, getExpirationDate } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { sendInvitationEmail } from "@/lib/email"
import { withTransaction } from "@/lib/db/transactions"
import type { Invitation, SafeInvitation, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { z } from "zod"
import type { RouteContext } from "@/lib/api/middleware"

const superAdminInviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["member", "admin"]).default("member"),
  department: z.string().max(100).optional(),
})

// POST /api/super-admin/orgs/[orgId]/invite - Invite a user to a specific org (super admin only)
export const POST = withSuperAdmin(async (request: NextRequest, _auth, context?: RouteContext) => {
  try {
    const params = await context!.params
    const orgId = params.orgId
    const { email, role, department } = await validateBody(request, superAdminInviteSchema)

    // Verify org exists
    const org = await db.organizations.findById(orgId)
    if (!org) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingUser = await db.users.findByEmail(email)
    if (existingUser) {
      const existingMember = await db.members.findByOrgAndUser(orgId, existingUser.id)
      if (existingMember && existingMember.status === "active") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "This user is already a member of this organization" },
          { status: 409 }
        )
      }
    }

    // Check for existing pending invitation
    const existingInvitations = await db.invitations.findPendingByEmail(email)
    const existingOrgInvite = existingInvitations.find(i => i.organizationId === orgId)
    if (existingOrgInvite) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "An invitation has already been sent to this email for this organization" },
        { status: 409 }
      )
    }

    // Create invitation in transaction
    const invitation = await withTransaction(async (client) => {
      const now = new Date().toISOString()
      const invitationId = generateId()
      const token = generateInviteToken()
      const expiresAt = getExpirationDate(7)

      await client.sql`
        INSERT INTO invitations (
          id, organization_id, email, role, department,
          token, status, invited_by, expires_at, created_at, updated_at
        )
        VALUES (
          ${invitationId}, ${orgId}, ${email}, ${role}, ${department || "General"},
          ${token}, 'pending', ${_auth.user.id}, ${expiresAt}, ${now}, ${now}
        )
      `

      const inv: Invitation = {
        id: invitationId,
        organizationId: orgId,
        email,
        role,
        department: department || "General",
        token,
        status: "pending",
        invitedBy: _auth.user.id,
        expiresAt,
        createdAt: now,
      }
      return inv
    })

    // Send invitation email (non-blocking)
    try {
      await sendInvitationEmail(invitation, org, _auth.user.name || "A super admin")
    } catch (emailError) {
      logError(logger, "Failed to send invitation email", emailError)
    }

    const { token: _token, ...safeInvitation } = invitation

    return NextResponse.json<ApiResponse<SafeInvitation>>({
      success: true,
      data: safeInvitation,
      message: `Invitation sent to ${email}`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Super admin invite error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send invitation" },
      { status: 500 }
    )
  }
})
