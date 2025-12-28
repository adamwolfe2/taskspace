import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId, generateInviteToken, getExpirationDate, validateEmail } from "@/lib/auth/password"
import { sendInvitationEmail } from "@/lib/email"
import type { Invitation, ApiResponse } from "@/lib/types"

interface BulkInviteResult {
  successful: Invitation[]
  failed: Array<{ email: string; error: string }>
}

// POST /api/invitations/bulk - Send multiple invitations at once
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can invite members" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { emails, role = "member", department = "General" } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one email address is required" },
        { status: 400 }
      )
    }

    if (emails.length > 50) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Maximum 50 invitations at once" },
        { status: 400 }
      )
    }

    // Get current counts for subscription limit check
    const members = await db.members.findByOrganizationId(auth.organization.id)
    const existingInvitations = await db.invitations.findByOrganizationId(auth.organization.id)
    const pendingInvites = existingInvitations.filter(i => i.status === "pending")

    const currentTotal = members.length + pendingInvites.length
    const maxUsers = auth.organization.subscription.maxUsers
    const availableSlots = maxUsers - currentTotal

    if (emails.length > availableSlots) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `You can only invite ${availableSlots} more users. Your plan allows ${maxUsers} total users.`
        },
        { status: 403 }
      )
    }

    const result: BulkInviteResult = {
      successful: [],
      failed: [],
    }

    const now = new Date().toISOString()

    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase()

      // Validate email
      if (!validateEmail(trimmedEmail)) {
        result.failed.push({ email: trimmedEmail, error: "Invalid email format" })
        continue
      }

      // Check if user is already a member
      const existingUser = await db.users.findByEmail(trimmedEmail)
      if (existingUser) {
        const existingMember = await db.members.findByOrgAndUser(auth.organization.id, existingUser.id)
        if (existingMember) {
          result.failed.push({ email: trimmedEmail, error: "Already a member" })
          continue
        }
      }

      // Check for existing pending invitation
      const existingPending = await db.invitations.findPendingByEmail(trimmedEmail)
      const existingOrgInvite = existingPending.find(i => i.organizationId === auth.organization.id)
      if (existingOrgInvite) {
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
              console.warn(`Failed to send invitation email to ${trimmedEmail}:`, emailResult.error)
            }
          })
          .catch(err => console.error(`Email send error for ${trimmedEmail}:`, err))
      } catch (err) {
        console.error(`Failed to create invitation for ${trimmedEmail}:`, err)
        result.failed.push({ email: trimmedEmail, error: "Failed to create invitation" })
      }
    }

    return NextResponse.json<ApiResponse<BulkInviteResult>>({
      success: true,
      data: result,
      message: `Successfully sent ${result.successful.length} invitation(s)${result.failed.length > 0 ? `, ${result.failed.length} failed` : ""}`,
    })
  } catch (error) {
    console.error("Bulk invite error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send invitations" },
      { status: 500 }
    )
  }
}
