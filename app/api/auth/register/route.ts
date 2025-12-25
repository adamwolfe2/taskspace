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
import type { User, Organization, OrganizationMember, Session, ApiResponse, AuthResponse } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
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
      passwordHash: hashPassword(password),
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
          maxUsers: 5,
          features: ["basic_rocks", "basic_tasks", "eod_reports"],
        },
      }

      await db.organizations.create(organization)

      // Create member record for owner
      member = {
        id: generateId(),
        organizationId: orgId,
        userId,
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
    console.error("Registration error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred during registration" },
      { status: 500 }
    )
  }
}
