import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { generateId, generateInviteToken, getExpirationDate } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { inviteMemberSchema } from "@/lib/validation/schemas"
import { sendInvitationEmail } from "@/lib/email"
import { canAddUser, buildFeatureGateContext } from "@/lib/billing/feature-gates"
import { getUserWorkspaces } from "@/lib/db/workspaces"
import type { Invitation, SafeInvitation, ApiResponse, Organization, OrganizationSettings, SubscriptionInfo } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withTransaction } from "@/lib/db/transactions"

// GET /api/invitations - Get all pending invitations
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const invitations = await db.invitations.findByOrganizationId(auth.organization.id)
    const pendingInvitations = invitations.filter(i => i.status === "pending")

    // Strip tokens from list responses - tokens should only be used via email invite links
    const safeInvitations: SafeInvitation[] = pendingInvitations.map(({ token: _token, ...rest }) => rest)

    return NextResponse.json<ApiResponse<SafeInvitation[]>>({
      success: true,
      data: safeInvitations,
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
    const { email, role, department } = await validateBody(request, inviteMemberSchema)

    // Pre-flight checks (can do outside transaction)
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

    // Execute critical section in transaction with row-level locking to prevent seat limit bypasses
    const result = await withTransaction(async (client) => {
      const now = new Date().toISOString()

      // CRITICAL: Lock the organization row with FOR UPDATE to prevent concurrent seat limit bypasses
      const { rows: orgRows } = await client.sql<{
        id: string
        name: string
        slug: string
        owner_id: string
        settings: Record<string, unknown>
        subscription: Record<string, unknown>
        created_at: string
        updated_at: string
      }>`SELECT * FROM organizations WHERE id = ${auth.organization.id} FOR UPDATE`

      if (orgRows.length === 0) {
        throw new Error("Organization not found")
      }

      const lockedOrg = orgRows[0]

      // Check for draft member within transaction
      const { rows: draftMemberRows } = await client.sql<{
        id: string
        organization_id: string
        user_id: string | null
        email: string
        name: string
        role: string
        department: string
        joined_at: string
        invited_by: string | null
        status: string
      }>`SELECT * FROM organization_members WHERE organization_id = ${auth.organization.id} AND LOWER(email) = LOWER(${email})`

      const draftMember = draftMemberRows.length > 0 ? draftMemberRows[0] : null

      // Check subscription limits only if creating a new member (within transaction)
      if (!draftMember) {
        // Count members and pending invitations atomically
        const { rows: memberCountRows } = await client.sql<{ count: number }>`
          SELECT COUNT(*)::int as count FROM organization_members WHERE organization_id = ${auth.organization.id}
        `

        const { rows: pendingInvitesCountRows } = await client.sql<{ count: number }>`
          SELECT COUNT(*)::int as count FROM invitations WHERE organization_id = ${auth.organization.id} AND status = 'pending'
        `

        const memberCount = memberCountRows[0].count
        const pendingInvitesCount = pendingInvitesCountRows[0].count
        const totalUsers = memberCount + pendingInvitesCount

        // Get workspaces for feature gate check
        const workspaces = await getUserWorkspaces(auth.user.id, auth.organization.id)

        // Build organization object for feature gate
        const organization: Organization = {
          id: lockedOrg.id,
          name: lockedOrg.name,
          slug: lockedOrg.slug,
          ownerId: lockedOrg.owner_id,
          settings: lockedOrg.settings as unknown as OrganizationSettings,
          subscription: lockedOrg.subscription as unknown as SubscriptionInfo,
          createdAt: new Date(lockedOrg.created_at).toISOString(),
          updatedAt: new Date(lockedOrg.updated_at).toISOString(),
        }

        // Check feature gate: Can add user?
        const featureContext = await buildFeatureGateContext(
          organization.id,
          organization.subscription,
          {
            activeUsers: totalUsers,
            workspaces: workspaces.length,
          },
          auth.organization.isInternal
        )

        const userCheck = canAddUser(featureContext)
        if (!userCheck.allowed) {
          throw new Error(userCheck.reason || "Cannot add user")
        }
      }

      // Create invitation within transaction
      const invitationId = generateId()
      const invitationToken = generateInviteToken()
      const invitationExpiresAt = getExpirationDate(24 * 7)
      const invitationRole = role === "admin" ? "admin" : "member"
      const invitationDepartment = draftMember?.department || department

      await client.sql`
        INSERT INTO invitations (id, organization_id, email, role, department, token, expires_at, created_at, invited_by, status, workspace_id)
        VALUES (${invitationId}, ${auth.organization.id}, ${email.toLowerCase()}, ${invitationRole}, ${invitationDepartment},
                ${invitationToken}, ${invitationExpiresAt}, ${now}, ${auth.user.id}, ${"pending"}, ${null})
      `

      const invitation: Invitation = {
        id: invitationId,
        organizationId: auth.organization.id,
        email: email.toLowerCase(),
        role: invitationRole,
        department: invitationDepartment,
        token: invitationToken,
        expiresAt: invitationExpiresAt,
        createdAt: now,
        invitedBy: auth.user.id,
        status: "pending",
      }

      // Update draft member status to "invited" if exists
      if (draftMember) {
        await client.sql`UPDATE organization_members SET status = ${"invited"} WHERE id = ${draftMember.id}`
      }

      return {
        invitation,
        draftMemberExists: !!draftMember,
      }
    })

    // Post-transaction: Send invitation email (non-critical, can fail)
    const emailResult = await sendInvitationEmail(result.invitation, auth.organization, auth.user.name)

    if (!emailResult.success) {
      logError(logger, "Failed to send invitation email", emailResult.error)
    }

    return NextResponse.json<ApiResponse<Invitation & { emailSent?: boolean; emailError?: string }>>({
      success: true,
      data: {
        ...result.invitation,
        emailSent: emailResult.success,
        emailError: emailResult.success ? undefined : String(emailResult.error),
      },
      message: result.draftMemberExists
        ? "Invitation created! The team member's pre-configured rocks and tasks will be linked when they accept."
        : emailResult.success
          ? "Invitation sent successfully"
          : `Invitation created but email failed: ${emailResult.error}. You can copy the invite link manually.`,
    })
  } catch (error: unknown) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    // Handle seat limit errors
    if (error instanceof Error && error.message.includes("Cannot add user")) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: error.message,
          meta: {
            upgradeRequired: true,
          },
        },
        { status: 403 }
      )
    }

    logError(logger, "Create invitation error", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Failed to send invitation"
      },
      { status: 500 }
    )
  }
})

// PATCH /api/invitations - Resend an invitation
export const PATCH = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const invitationId = body.id as string | undefined

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

    // Generate a new token and extend the expiration
    const newToken = generateInviteToken()
    const newExpiresAt = getExpirationDate(24 * 7) // 7 days

    await db.invitations.update(invitationId, {
      token: newToken,
      expiresAt: newExpiresAt,
      status: "pending",
    })

    // Re-fetch the updated invitation with the new token
    const updatedInvitation: Invitation = {
      ...invitation,
      token: newToken,
      expiresAt: newExpiresAt,
      status: "pending",
    }

    // Send the invitation email
    const emailResult = await sendInvitationEmail(updatedInvitation, auth.organization, auth.user.name)

    if (!emailResult.success) {
      logError(logger, "Failed to resend invitation email", emailResult.error)
    }

    // Build the invite link so admin can copy it manually if email fails
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://trytaskspace.com"}/app?invite=${newToken}`

    return NextResponse.json<ApiResponse<{ emailSent: boolean; inviteLink: string }>>({
      success: true,
      data: {
        emailSent: emailResult.success,
        inviteLink,
      },
      message: emailResult.success
        ? "Invitation resent successfully"
        : `Email failed to send. Share this link manually: ${inviteLink}`,
    })
  } catch (error) {
    logError(logger, "Resend invitation error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to resend invitation" },
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
