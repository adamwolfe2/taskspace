import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  hashPassword,
  generateId,
  generateToken,
  getExpirationDate,
  isTokenExpired,
  validatePassword,
} from "@/lib/auth/password"
import type { User, OrganizationMember, Session, ApiResponse, AuthResponse } from "@/lib/types"

// POST /api/invitations/accept - Accept an invitation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, name, password } = body

    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invitation token is required" },
        { status: 400 }
      )
    }

    // Find invitation
    const invitation = await db.invitations.findByToken(token)
    if (!invitation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid invitation" },
        { status: 404 }
      )
    }

    if (invitation.status !== "pending") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This invitation has already been used or expired" },
        { status: 400 }
      )
    }

    if (isTokenExpired(invitation.expiresAt)) {
      await db.invitations.update(invitation.id, { status: "expired" })
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This invitation has expired" },
        { status: 400 }
      )
    }

    // Get organization
    const organization = await db.organizations.findById(invitation.organizationId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()
    let user = await db.users.findByEmail(invitation.email)
    let isNewUser = false

    if (!user) {
      // New user - create account
      if (!name || !password) {
        return NextResponse.json<ApiResponse<{ needsRegistration: true; email: string; organizationName: string }>>(
          {
            success: true,
            data: {
              needsRegistration: true,
              email: invitation.email,
              organizationName: organization.name,
            },
            message: "Please complete your registration",
          },
          { status: 200 }
        )
      }

      // Validate password
      const passwordValidation = validatePassword(password)
      if (!passwordValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: passwordValidation.message },
          { status: 400 }
        )
      }

      user = {
        id: generateId(),
        email: invitation.email.toLowerCase(),
        passwordHash: await hashPassword(password),
        name,
        createdAt: now,
        updatedAt: now,
        emailVerified: true, // Verified via invitation
        lastLoginAt: now,
      }

      await db.users.create(user)
      isNewUser = true
    }

    // Check if already an active member via user ID
    const existingMember = await db.members.findByOrgAndUser(organization.id, user.id)
    if (existingMember && existingMember.status === "active") {
      await db.invitations.update(invitation.id, { status: "accepted" })
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You are already a member of this organization" },
        { status: 409 }
      )
    }

    // Check for draft/invited member (created before invitation was sent)
    const draftMember = await db.members.findByOrgAndEmail(organization.id, invitation.email)

    let member: OrganizationMember

    if (draftMember) {
      // Update existing draft member with the user ID and activate
      await db.members.update(draftMember.id, {
        userId: user.id,
        name: user.name, // Update with the registered name
        status: "active",
      })
      member = {
        ...draftMember,
        userId: user.id,
        name: user.name,
        status: "active",
      }
    } else {
      // Create new membership
      member = {
        id: generateId(),
        organizationId: organization.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        role: invitation.role,
        department: invitation.department,
        joinedAt: now,
        invitedBy: invitation.invitedBy,
        status: "active",
      }
      await db.members.create(member)
    }

    // Mark invitation as accepted
    await db.invitations.update(invitation.id, { status: "accepted" })

    // Create session
    const sessionToken = generateToken()
    const session: Session = {
      id: generateId(),
      userId: user.id,
      organizationId: organization.id,
      token: sessionToken,
      expiresAt: getExpirationDate(24 * 7),
      createdAt: now,
      lastActiveAt: now,
    }

    await db.sessions.create(session)

    // Return response without password hash
    const { passwordHash: _, ...safeUser } = user

    const response = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser as any,
        organization,
        member,
        token: sessionToken,
        expiresAt: session.expiresAt,
      },
      message: isNewUser
        ? "Account created and joined organization successfully"
        : "Joined organization successfully",
    })

    // Set cookie
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(session.expiresAt),
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Accept invitation error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to accept invitation" },
      { status: 500 }
    )
  }
}

// GET /api/invitations/accept - Get invitation details
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invitation token is required" },
        { status: 400 }
      )
    }

    const invitation = await db.invitations.findByToken(token)
    if (!invitation) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid invitation" },
        { status: 404 }
      )
    }

    if (invitation.status !== "pending") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This invitation has already been used" },
        { status: 400 }
      )
    }

    if (isTokenExpired(invitation.expiresAt)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This invitation has expired" },
        { status: 400 }
      )
    }

    const organization = await db.organizations.findById(invitation.organizationId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user already exists
    const existingUser = await db.users.findByEmail(invitation.email)

    return NextResponse.json<ApiResponse<{
      email: string
      organizationName: string
      role: string
      department: string
      existingUser: boolean
    }>>({
      success: true,
      data: {
        email: invitation.email,
        organizationName: organization.name,
        role: invitation.role,
        department: invitation.department,
        existingUser: !!existingUser,
      },
    })
  } catch (error) {
    console.error("Get invitation error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get invitation details" },
      { status: 500 }
    )
  }
}
