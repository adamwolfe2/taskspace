import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { generateId, generateInviteToken, getExpirationDate } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { inviteMemberSchema } from "@/lib/validation/schemas"
import { sendInvitationEmail } from "@/lib/email"
import { canAddUser, buildFeatureGateContext } from "@/lib/billing/feature-gates"
import { getUserWorkspaces } from "@/lib/db/workspaces"
import type { Invitation, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/invitations - Get all pending invitations
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const invitations = await db.invitations.findByOrganizationId(auth.organization.id)
    const pendingInvitations = invitations.filter(i => i.status === "pending")

    return NextResponse.json<ApiResponse<Invitation[]>>({
      success: true,
      data: pendingInvitations,
    })
  } catch (error) {
    logError(logger, "Get invitations error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get invitations" },
      { status: 500 }
    )
  }
})

// POST /api/invitations - Create a new invitation
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { email, role, department, workspaceId, name: _name } = await validateBody(request, inviteMemberSchema)

    // Check if user is already an active member
    const existingUser = await db.users.findByEmail(email)
    if (existingUser) {
      const existingMember = await db.members.findByOrgAndUser(auth.organization.id, existingUser.id)
      if (existingMember && existingMember.status === "active") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "This user is already a member of your organization" },
          { status: 409 }
        )
      }
    }

    // Check for existing pending invitation
    const existingInvitations = await db.invitations.findPendingByEmail(email)
    const existingOrgInvite = existingInvitations.find(i => i.organizationId === auth.organization.id)
    if (existingOrgInvite) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "An invitation has already been sent to this email" },
        { status: 409 }
      )
    }

    // Check for existing draft member - if exists, update status to "invited"
    const draftMember = await db.members.findByOrgAndEmail(auth.organization.id, email)

    // Check subscription limits only if creating a new member
    if (!draftMember) {
      const members = await db.members.findByOrganizationId(auth.organization.id)
      const pendingInvites = (await db.invitations.findByOrganizationId(auth.organization.id))
        .filter(i => i.status === "pending")
      const workspaces = await getUserWorkspaces(auth.user.id)

      const totalUsers = members.length + pendingInvites.length

      // Check feature gate: Can add user?
      const featureContext = await buildFeatureGateContext(
        auth.organization.id,
        auth.organization.subscription,
        {
          activeUsers: totalUsers,
          workspaces: workspaces.length,
        }
      )

      const userCheck = canAddUser(featureContext)
      if (!userCheck.allowed) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: userCheck.reason || "Cannot add user",
            upgradeRequired: userCheck.upgradeRequired,
          },
          { status: 403 }
        )
      }
    }

    const now = new Date().toISOString()
    const invitation: Invitation = {
      id: generateId(),
      organizationId: auth.organization.id,
      email: email.toLowerCase(),
      role: role === "admin" ? "admin" : "member",
      department: draftMember?.department || department,
      token: generateInviteToken(),
      expiresAt: getExpirationDate(24 * 7), // 7 days
      createdAt: now,
      invitedBy: auth.user.id,
      status: "pending",
      // Don't include workspaceId until migrations are run
      // workspaceId: workspaceId || null,
    }

    try {
      await db.invitations.create(invitation)
    } catch (dbError: any) {
      logError(logger, "Database error creating invitation", dbError)
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Database error: ${dbError.message || "Failed to create invitation"}`
        },
        { status: 500 }
      )
    }

    // Update draft member status to "invited" if exists
    if (draftMember) {
      await db.members.update(draftMember.id, { status: "invited" })
    }

    // Send invitation email and capture result
    const emailResult = await sendInvitationEmail(invitation, auth.organization, auth.user.name)

    if (!emailResult.success) {
      logError(logger, "Failed to send invitation email", emailResult.error)
    }

    return NextResponse.json<ApiResponse<Invitation & { emailSent?: boolean; emailError?: string }>>({
      success: true,
      data: {
        ...invitation,
        emailSent: emailResult.success,
        emailError: emailResult.success ? undefined : String(emailResult.error),
      },
      message: draftMember
        ? "Invitation created! The team member's pre-configured rocks and tasks will be linked when they accept."
        : emailResult.success
          ? "Invitation sent successfully"
          : `Invitation created but email failed: ${emailResult.error}. You can copy the invite link manually.`,
    })
  } catch (error: any) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Create invitation error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: error.message || "Failed to send invitation"
      },
      { status: 500 }
    )
  }
})

// DELETE /api/invitations - Cancel an invitation
export const DELETE = withAdmin(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get("id")

    if (!invitationId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invitation ID is required" },
        { status: 400 }
      )
    }

    const invitations = await db.invitations.findByOrganizationId(auth.organization.id)
    const invitation = invitations.find(i => i.id === invitationId)

    if (!invitation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invitation not found" },
        { status: 404 }
      )
    }

    await db.invitations.delete(invitationId)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Invitation cancelled",
    })
  } catch (error) {
    logError(logger, "Cancel invitation error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to cancel invitation" },
      { status: 500 }
    )
  }
})
