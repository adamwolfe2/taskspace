import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse, TeamMember } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const sessionToken = request.cookies.get("session_token")?.value || ""

    // Build team member for UI
    const teamMember: TeamMember = {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      role: auth.member.role,
      department: auth.member.department,
      avatar: auth.user.avatar,
      joinDate: auth.member.joinedAt,
      weeklyMeasurable: auth.member.weeklyMeasurable,
      status: auth.member.status,
    }

    // Return response without password hash
    const { passwordHash: _, ...safeUser } = auth.user

    return NextResponse.json<ApiResponse<{
      user: typeof safeUser,
      organization: typeof auth.organization,
      member: typeof auth.member,
      teamMember: TeamMember,
      token: string,
    }>>({
      success: true,
      data: {
        user: safeUser,
        organization: auth.organization,
        member: auth.member,
        teamMember,
        token: sessionToken,
      },
    })
  } catch (error) {
    logError(logger, "Session check error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred while checking session" },
      { status: 500 }
    )
  }
})
