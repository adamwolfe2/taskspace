import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { generateId, generateInviteToken, getExpirationDate } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { bulkInviteSchema } from "@/lib/validation/schemas"
import { sendInvitationEmail } from "@/lib/email"
import type { Invitation, SafeInvitation, ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface BulkInviteResult {
  successful: SafeInvitation[]
  failed: Array<{ email: string; error: string }>
}

// POST /api/invitations/bulk - Send multiple invitations at once
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { emails, role, department } = await validateBody(request, bulkInviteSchema)

    const result: { successful: Invitation[]; failed: Array<{ email: string; error: string }> } = {
      successful: [],
      failed: [],
    }

    const now = new Date().toISOString()
    const normalizedEmails = emails.map(e => e.toLowerCase())

    // OPTIMIZED: Batch fetch all users and existing invitations upfront instead of N+1 queries
    const [existingUsers, orgMembers, existingInvitations] = await Promise.all([
      db.users.findByEmails(normalizedEmails),
      db.members.findByOrganizationId(auth.organization.id),
      db.invitations.findByOrganizationId(auth.organization.id),
    ])

    // Subscription limit check
    const pendingInvites = existingInvitations.filter(i => i.status === "pending")
    const currentTotal = orgMembers.length + pendingInvites.length
    const maxUsers = auth.organization.subscription.maxUsers
    const availableSlots = maxUsers === null ? Infinity : maxUsers - currentTotal

    if (emails.length > availableSlots) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `You can only invite ${availableSlots} more users. Your plan allows ${maxUsers} total users.`
        },
        { status: 403 }
      )
    }

    // Build lookup maps for O(1) checks
    const userByEmail = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]))
    const memberByUserId = new Map(orgMembers.map(m => [m.userId, m]))
    const pendingInviteEmails = new Set(
      existingInvitations
        .filter(i => i.status === "pending")
        .map(i => i.email.toLowerCase())
    )

    for (const trimmedEmail of normalizedEmails) {
      // Check if user is already a member
      const existingUser = userByEmail.get(trimmedEmail)
      if (existingUser) {
        const existingMember = memberByUserId.get(existingUser.id)
        if (existingMember) {
          result.failed.push({ email: trimmedEmail, error: "Already a member" })
          continue
        }
      }

      // Check for existing pending invitation
      if (pendingInviteEmails.has(trimmedEmail)) {
        result.failed.push({ email: trimmedEmail, error: "Invitation already sent" })
        continue
      }

      // Create invitation
      const invitation: Invitation = {
        id: generateId(),
        organizationId: auth.organization.id,
        email: trimmedEmail,
        role: role === "admin" ? "admin" : "member",
        department,
        token: generateInviteToken(),
        expiresAt: getExpirationDate(24 * 7), // 7 days
        createdAt: now,
        invitedBy: auth.user.id,
        status: "pending",
      }

      try {
        await db.invitations.create(invitation)
        result.successful.push(invitation)

        // Send invitation email (async, don't block)
        sendInvitationEmail(invitation, auth.organization, auth.user.name)
          .then(emailResult => {
            if (!emailResult.success) {
              logger.warn({ email: trimmedEmail, error: emailResult.error }, "Failed to send invitation email")
            }
          })
          .catch(err => logError(logger, `Email send error for ${trimmedEmail}`, err))
      } catch (err) {
        logError(logger, `Failed to create invitation for ${trimmedEmail}`, err)
        result.failed.push({ email: trimmedEmail, error: "Failed to create invitation" })
      }
    }

    // Strip tokens from response - tokens should only be used via email invite links
    const safeResult: BulkInviteResult = {
      successful: result.successful.map(({ token: _token, ...rest }) => rest),
      failed: result.failed,
    }

    return NextResponse.json<ApiResponse<BulkInviteResult>>({
      success: true,
      data: safeResult,
      message: `Successfully sent ${result.successful.length} invitation(s)${result.failed.length > 0 ? `, ${result.failed.length} failed` : ""}`,
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Bulk invite error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send invitations" },
      { status: 500 }
    )
  }
})
