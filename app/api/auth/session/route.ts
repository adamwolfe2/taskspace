import { NextRequest, NextResponse } from "next/server"
import { withAuth, withUserAuth } from "@/lib/api/middleware"
import { getAuthContext } from "@/lib/auth/middleware"
import type { ApiResponse, TeamMember } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export const GET = withUserAuth(async (request: NextRequest, auth) => {
  try {
    const sessionToken = request.cookies.get("session_token")?.value || ""

    // Try to get full auth context (with org + member)
    const fullAuth = await getAuthContext(request)

    if (fullAuth) {
      // User has org membership - return full session data
      const teamMember: TeamMember = {
        id: fullAuth.user.id,
        name: fullAuth.user.name,
        email: fullAuth.user.email,
        role: fullAuth.member.role,
        department: fullAuth.member.department,
        avatar: fullAuth.user.avatar,
        joinDate: fullAuth.member.joinedAt,
        weeklyMeasurable: fullAuth.member.weeklyMeasurable,
        status: fullAuth.member.status,
      }

      const { passwordHash: _, ...safeUser } = fullAuth.user

      return NextResponse.json<ApiResponse<{
        user: typeof safeUser,
        organization: typeof fullAuth.organization,
        member: typeof fullAuth.member,
        teamMember: TeamMember,
        token: string,
      }>>({
        success: true,
        data: {
          user: safeUser,
          organization: fullAuth.organization,
          member: fullAuth.member,
          teamMember,
          token: sessionToken,
        },
      })
    }

    // User is authenticated but has no org - return user-only data for onboarding
    const { passwordHash: _, ...safeUser } = auth.user

    return NextResponse.json<ApiResponse<{
      user: typeof safeUser,
      needsOrganization: boolean,
      token: string,
    }>>({
      success: true,
      data: {
        user: safeUser,
        needsOrganization: true,
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
