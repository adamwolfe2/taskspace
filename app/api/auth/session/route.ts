import { NextRequest, NextResponse } from "next/server"
import { withUserAuth } from "@/lib/api/middleware"
import { getAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
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
        isSuperAdmin: boolean,
      }>>({
        success: true,
        data: {
          user: safeUser,
          organization: fullAuth.organization,
          member: fullAuth.member,
          teamMember,
          token: sessionToken,
          isSuperAdmin: fullAuth.isSuperAdmin,
        },
      })
    }

    // Full auth failed — but user IS authenticated (withUserAuth passed).
    // Check if user actually has org memberships before assuming they need onboarding.
    const memberships = await db.members.findByUserId(auth.user.id)
    const activeMembership = memberships.find((m) => m.status === "active") || memberships[0]

    if (activeMembership) {
      // User HAS orgs — session just has a stale/empty organizationId.
      // Auto-repair the session and return full auth data.
      const organization = await db.organizations.findById(activeMembership.organizationId)

      if (organization) {
        // Repair the session so future requests work without this fallback
        if (sessionToken) {
          await db.sessions.updateOrganization(sessionToken, organization.id)
        }

        const teamMember: TeamMember = {
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          role: activeMembership.role,
          department: activeMembership.department,
          avatar: auth.user.avatar,
          joinDate: activeMembership.joinedAt,
          weeklyMeasurable: activeMembership.weeklyMeasurable,
          status: activeMembership.status,
        }

        const { passwordHash: _, ...safeUser } = auth.user

        logger.info(
          { userId: auth.user.id, orgId: organization.id },
          "Auto-repaired session with missing organizationId"
        )

        return NextResponse.json<ApiResponse<{
          user: typeof safeUser,
          organization: typeof organization,
          member: typeof activeMembership,
          teamMember: TeamMember,
          token: string,
          isSuperAdmin: boolean,
        }>>({
          success: true,
          data: {
            user: safeUser,
            organization,
            member: activeMembership,
            teamMember,
            token: sessionToken,
            isSuperAdmin: auth.user.isSuperAdmin || false,
          },
        })
      }
    }

    // User truly has no org memberships - return user-only data for onboarding
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
