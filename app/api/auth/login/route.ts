import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  verifyPassword,
  generateId,
  generateToken,
  getExpirationDate,
} from "@/lib/auth/password"
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
  getRateLimitHeaders,
} from "@/lib/auth/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { loginSchema } from "@/lib/validation/schemas"
import { logger, logAuthEvent, formatError } from "@/lib/logger"
import type { Session, ApiResponse, AuthResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = checkLoginRateLimit(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Too many login attempts. Please wait a few minutes and try again.",
        },
        { status: 429 }
      )
      // Add rate limit headers
      const headers = getRateLimitHeaders(rateLimitResult, 5)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    // Validate request body
    const { email, password, organizationId } = await validateBody(request, loginSchema)

    // Find user
    const user = await db.users.findByEmail(email)
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // Get user's organizations
    const memberships = await db.members.findByUserId(user.id)

    if (memberships.length === 0) {
      // User has no organizations - they may need to create one or accept an invitation
      return NextResponse.json<ApiResponse<{ needsOrganization: true; userId: string }>>(
        {
          success: true,
          data: { needsOrganization: true, userId: user.id },
          message: "Login successful but no organization found"
        },
        { status: 200 }
      )
    }

    // Determine which organization to use
    let selectedOrgId = organizationId
    if (!selectedOrgId) {
      // Default to first active membership
      const activeMembership = memberships.find(m => m.status === "active")
      if (activeMembership) {
        selectedOrgId = activeMembership.organizationId
      } else {
        selectedOrgId = memberships[0].organizationId
      }
    }

    // Verify user is member of selected organization
    const membership = memberships.find(m => m.organizationId === selectedOrgId)
    if (!membership) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You are not a member of this organization" },
        { status: 403 }
      )
    }

    // Get organization details
    const organization = await db.organizations.findById(selectedOrgId)
    if (!organization) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    const now = new Date().toISOString()

    // Update user's last login
    await db.users.update(user.id, { lastLoginAt: now })

    // Create new session
    const sessionToken = generateToken()
    const session: Session = {
      id: generateId(),
      userId: user.id,
      organizationId: selectedOrgId,
      token: sessionToken,
      expiresAt: getExpirationDate(24 * 7), // 7 days
      createdAt: now,
      lastActiveAt: now,
    }

    await db.sessions.create(session)

    // Reset rate limit on successful login
    resetLoginRateLimit(request)

    // Log successful login
    logAuthEvent("login", user.id, true, { orgId: selectedOrgId })

    // Return response without password hash
    const { passwordHash: _passwordHash, ...safeUser } = user

    const response = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        organization,
        member: membership,
        token: sessionToken,
        expiresAt: session.expiresAt,
      },
      message: "Login successful",
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
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logger.error({ error: formatError(error) }, "Login error")
    logAuthEvent("login", undefined, false, { error: formatError(error) })

    // Never expose internal error details in responses
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred during login. Please try again later." },
      { status: 500 }
    )
  }
}
