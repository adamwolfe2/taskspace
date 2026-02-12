import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { generateId, generateToken, getExpirationDate } from "@/lib/auth/password"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { switchOrganizationSchema } from "@/lib/validation/schemas"
import type { ApiResponse, Session } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { CONFIG } from "@/lib/config"
import { audit } from "@/lib/audit"

/**
 * POST /api/user/switch-organization
 * Switch the current user's session to a different organization.
 * Rotates the session token to prevent session fixation across orgs.
 */
export const POST = withAuth(async (request, auth) => {
  try {
    // Validate request body using Zod schema
    const { organizationId } = await validateBody(request, switchOrganizationSchema)

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

    // Delete old session and create a new one with a fresh token (session rotation)
    const oldToken = request.cookies.get("session_token")?.value
    if (!oldToken) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Session not found" },
        { status: 401 }
      )
    }

    await db.sessions.deleteByToken(oldToken)

    const now = new Date().toISOString()
    const newToken = generateToken()
    const session: Session = {
      id: generateId(),
      userId: auth.user.id,
      organizationId,
      token: newToken,
      expiresAt: getExpirationDate(24 * CONFIG.auth.sessionDurationDays),
      createdAt: now,
      lastActiveAt: now,
    }
    await db.sessions.create(session)

    audit(auth, request, "session.org_switched", {
      resourceType: "organization",
      resourceId: organizationId,
      oldValues: { organizationId: auth.organization.id },
      newValues: { organizationId },
    })

    const response = NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Organization switched successfully" },
    })

    // Set the rotated session cookie
    response.cookies.set("session_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(session.expiresAt),
      path: "/",
    })

    return response
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Switch organization error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to switch organization" },
      { status: 500 }
    )
  }
})
