import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import {
  hashPassword,
  generateId,
  generateToken,
  getExpirationDate,
  validateEmail,
  validatePassword,
  slugify,
} from "@/lib/auth/password"
import {
  checkRegisterRateLimit,
  getRateLimitHeaders,
} from "@/lib/auth/rate-limit"
import { logger, logAuthEvent, formatError } from "@/lib/logger"
import type { User, Organization, OrganizationMember, Session, ApiResponse, AuthResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitResult = checkRegisterRateLimit(request)
    if (!rateLimitResult.success) {
      const response = NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: `Too many registration attempts. Please try again in ${rateLimitResult.retryAfter} seconds.`,
        },
        { status: 429 }
      )
      const headers = getRateLimitHeaders(rateLimitResult)
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value)
      }
      return response
    }

    const body = await request.json()
    const { email, password, name, organizationName } = body

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Email, password, and name are required" },
        { status: 400 }
      )
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      )
    }

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
    }

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
        user: safeUser as any,
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
    logger.error({ error: formatError(error) }, "Registration error")
    logAuthEvent("register", undefined, false, { error: formatError(error) })

    // Provide more specific error messages
    let errorMessage = "An error occurred during registration"

    if (error instanceof Error) {
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        errorMessage = "Database tables not initialized. Please run the database migration."
      } else if (error.message.includes("connect") || error.message.includes("ECONNREFUSED")) {
        errorMessage = "Unable to connect to database. Please check database configuration."
      } else if (error.message.includes("duplicate key")) {
        errorMessage = "An account with this email already exists."
      } else if (process.env.NODE_ENV !== "production") {
        // In development, show the actual error
        errorMessage = error.message
      }
    }

    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
}
