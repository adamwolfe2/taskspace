import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/user/switch-organization
 * Switch the current user's session to a different organization
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { organizationId } = body

    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      )
    }

    // Verify user is a member of the target organization
    const membership = await db.members.findByOrgAndUser(
      organizationId,
      auth.user.id
    )

    if (!membership || membership.status !== "active") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You do not have access to this organization" },
        { status: 403 }
      )
    }

    // Verify the organization exists
    const organization = await db.organizations.findById(organizationId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Update the session to use the new organization
    const sessionToken = request.cookies.get("session_token")?.value
    if (!sessionToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Session not found" },
        { status: 401 }
      )
    }

    // Update session organization_id
    await db.sessions.updateOrganization(sessionToken, organizationId)

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Organization switched successfully" },
    })
  } catch (error) {
    logError(logger, "Switch organization error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to switch organization" },
      { status: 500 }
    )
  }
}
