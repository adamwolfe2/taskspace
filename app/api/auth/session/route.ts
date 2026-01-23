import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isTokenExpired } from "@/lib/auth/password"
import type { ApiResponse, TeamMember } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value

    if (!sessionToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "No session found" },
        { status: 401 }
      )
    }

    // Find session
    const session = await db.sessions.findByToken(sessionToken)
    if (!session) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid session" },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (isTokenExpired(session.expiresAt)) {
      await db.sessions.deleteByToken(sessionToken)
      const response = NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Session expired" },
        { status: 401 }
      )
      response.cookies.set("session_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: new Date(0),
        path: "/",
      })
      return response
    }

    // Get user
    const user = await db.users.findById(session.userId)
    if (!user) {
      await db.sessions.deleteByToken(sessionToken)
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User not found" },
        { status: 401 }
      )
    }

    // Get organization and membership
    const organization = session.organizationId
      ? await db.organizations.findById(session.organizationId)
      : null

    const member = session.organizationId
      ? await db.members.findByOrgAndUser(session.organizationId, user.id)
      : null

    // Update session last active
    await db.sessions.update(session.id, {
      lastActiveAt: new Date().toISOString(),
    })

    // Build team member for UI
    const teamMember: TeamMember | null = member && organization ? {
      id: user.id,
      name: user.name,
      email: user.email,
      role: member.role,
      department: member.department,
      avatar: user.avatar,
      joinDate: member.joinedAt,
      weeklyMeasurable: member.weeklyMeasurable,
      status: member.status,
    } : null

    // Return response without password hash
    const { passwordHash: _, ...safeUser } = user

    return NextResponse.json<ApiResponse<{
      user: Omit<typeof user, 'passwordHash'>,
      organization: typeof organization,
      member: typeof member,
      teamMember: TeamMember | null,
      token: string,
      expiresAt: string,
    }>>({
      success: true,
      data: {
        user: safeUser,
        organization: organization ?? null,
        member: member ?? null,
        teamMember,
        token: sessionToken,
        expiresAt: session.expiresAt,
      },
    })
  } catch (error) {
    logError(logger, "Session check error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred while checking session" },
      { status: 500 }
    )
  }
}
