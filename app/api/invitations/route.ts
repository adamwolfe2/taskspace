import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId, generateInviteToken, getExpirationDate, validateEmail } from "@/lib/auth/password"
import { sendInvitationEmail } from "@/lib/email"
import type { Invitation, ApiResponse } from "@/lib/types"

// GET /api/invitations - Get all pending invitations
export async function GET(request: NextRequest) {
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
        { success: false, error: "Only admins can view invitations" },
        { status: 403 }
      )
    }

    const invitations = await db.invitations.findByOrganizationId(auth.organization.id)
    const pendingInvitations = invitations.filter(i => i.status === "pending")

    return NextResponse.json<ApiResponse<Invitation[]>>({
      success: true,
      data: pendingInvitations,
    })
  } catch (error) {
    console.error("Get invitations error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get invitations" },
      { status: 500 }
    )
  }
}

// POST /api/invitations - Create a new invitation
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
    const { email, role = "member", department = "General", name } = body

    if (!email || !validateEmail(email)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Valid email is required" },
        { status: 400 }
      )
    }

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

      const totalUsers = members.length + pendingInvites.length
      if (totalUsers >= auth.organization.subscription.maxUsers) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `You have reached your plan limit of ${auth.organization.subscription.maxUsers} users. Please upgrade to add more team members.` },
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
    }

    await db.invitations.create(invitation)

    // Update draft member status to "invited" if exists
    if (draftMember) {
      await db.members.update(draftMember.id, { status: "invited" })
    }

    // Send invitation email (async, don't block on failure)
    sendInvitationEmail(invitation, auth.organization, auth.user.name)
      .then(result => {
        if (!result.success) {
          console.warn("Failed to send invitation email:", result.error)
        }
      })
      .catch(err => console.error("Email send error:", err))

    return NextResponse.json<ApiResponse<Invitation>>({
      success: true,
      data: invitation,
      message: draftMember
        ? "Invitation sent! The team member's pre-configured rocks and tasks will be linked when they accept."
        : "Invitation sent successfully",
    })
  } catch (error) {
    console.error("Create invitation error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send invitation" },
      { status: 500 }
    )
  }
}

// DELETE /api/invitations - Cancel an invitation
export async function DELETE(request: NextRequest) {
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
        { success: false, error: "Only admins can cancel invitations" },
        { status: 403 }
      )
    }

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
    console.error("Cancel invitation error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to cancel invitation" },
      { status: 500 }
    )
  }
}
