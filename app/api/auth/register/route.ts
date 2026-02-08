import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  hashPassword,
  generateId,
  generateToken,
  getExpirationDate,
  slugify,
} from "@/lib/auth/password"
import {
  checkRegisterRateLimit,
  getRateLimitHeaders,
} from "@/lib/auth/rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { registerSchema } from "@/lib/validation/schemas"
import { logger, logAuthEvent, formatError } from "@/lib/logger"
import { sendVerificationEmail } from "@/lib/email"
import type { User, Organization, OrganizationMember, Session, EmailVerificationToken, ApiResponse, AuthResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = checkRegisterRateLimit(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: "Too many registration attempts. Please wait a few minutes and try again.",
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult, 3)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    // Validate request body
    const { email, password, name, organizationName } = await validateBody(request, registerSchema)

    // Check if user already exists
    const existingUser = await db.users.findByEmail(email)
    if (existingUser) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    const now = new Date().toISOString()
    const userId = generateId()

    // Create user
    const user: User = {
      id: userId,
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      name,
      createdAt: now,
      updatedAt: now,
      emailVerified: false,
      lastLoginAt: now,
    }

    await db.users.create(user)

    let organization: Organization | undefined
    let member: OrganizationMember | undefined

    // If organization name provided, create organization
    if (organizationName) {
      const orgId = generateId()
      let slug = slugify(organizationName)

      // Ensure unique slug
      let existingOrg = await db.organizations.findBySlug(slug)
      let counter = 1
      while (existingOrg) {
        slug = `${slugify(organizationName)}-${counter}`
        existingOrg = await db.organizations.findBySlug(slug)
        counter++
      }

      organization = {
        id: orgId,
        name: organizationName,
        slug,
        createdAt: now,
        updatedAt: now,
        ownerId: userId,
        settings: {
          timezone: "America/New_York",
          weekStartDay: 1,
          eodReminderTime: "17:00",
          enableEmailNotifications: true,
          enableSlackIntegration: false,
        },
        subscription: {
          plan: "free",
          status: "active",
          currentPeriodEnd: getExpirationDate(24 * 30), // 30 days trial
          maxUsers: 100, // Internal tool - generous limit
          features: ["basic_rocks", "basic_tasks", "eod_reports"],
        },
      }

      await db.organizations.create(organization)

      // Create member record for owner
      member = {
        id: generateId(),
        organizationId: orgId,
        userId,
        email,
        name,
        role: "owner",
        department: "Leadership",
        joinedAt: now,
        status: "active",
      }

      await db.members.create(member)

      // Try to create default workspace
      // If this fails, registration still succeeds - workspace can be created via ensure-default endpoint
      try {
        const defaultWorkspaceId = generateId()
        const defaultWorkspace = {
          id: defaultWorkspaceId,
          organizationId: orgId,
          name: "Default",
          slug: "default",
          type: "team",
          description: "Default workspace for all organization members",
          isDefault: true,
          createdBy: userId,
          createdAt: now,
          updatedAt: now,
          settings: {},
        }

        await db.workspaces.create(defaultWorkspace)

        // Add owner to default workspace as admin
        const workspaceMember = {
          id: generateId(),
          workspaceId: defaultWorkspaceId,
          userId,
          role: "admin",
          joinedAt: now,
        }

        await db.workspaceMembers.create(workspaceMember)
      } catch (workspaceError) {
        // Log warning but don't fail registration - workspace can be created later
        logger.warn({
          error: formatError(workspaceError),
          userId,
          orgId,
        }, "Failed to create default workspace during registration")
      }
    }

    // Send email verification (non-blocking - don't fail registration if email fails)
    try {
      const verificationToken: EmailVerificationToken = {
        id: generateId(),
        userId,
        email: email.toLowerCase(),
        token: generateToken(),
        expiresAt: getExpirationDate(24), // 24 hours
        createdAt: now,
      }
      await db.emailVerificationTokens.create(verificationToken)
      await sendVerificationEmail(verificationToken, name)
      logger.info({ userId, email }, "Verification email sent on registration")
    } catch (emailError) {
      // Don't block registration if verification email fails
      logger.warn({ userId, error: formatError(emailError) }, "Failed to send verification email during registration")
    }

    // Enforce concurrent session limit (max 5 active sessions per user)
    await db.sessions.enforceSessionLimit(userId, 5)

    // Create session
    const sessionToken = generateToken()
    const session: Session = {
      id: generateId(),
      userId,
      organizationId: organization?.id || "",
      token: sessionToken,
      expiresAt: getExpirationDate(24 * 7), // 7 days
      createdAt: now,
      lastActiveAt: now,
    }

    await db.sessions.create(session)

    // Log successful registration
    logAuthEvent("register", userId, true, {
      orgId: organization?.id,
      orgName: organization?.name,
    })

    // Return response without password hash
    const { passwordHash: _passwordHash, ...safeUser } = user

    const response = NextResponse.json<ApiResponse<AuthResponse>>({
      success: true,
      data: {
        user: safeUser,
        organization,
        member,
        token: sessionToken,
        expiresAt: session.expiresAt,
      },
      message: organization
        ? "Account and organization created successfully"
        : "Account created successfully",
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

    logger.error({ error: formatError(error) }, "Registration error")
    logAuthEvent("register", undefined, false, { error: formatError(error) })

    // Handle duplicate key errors with appropriate status code
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // Never expose internal error details in responses
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred during registration. Please try again later." },
      { status: 500 }
    )
  }
}
