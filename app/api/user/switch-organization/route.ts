import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { CONFIG } from "@/lib/config"

// POST /api/user/switch-organization - Switch to a different organization
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { organizationId } = body

    if (!organizationId || typeof organizationId !== "string") {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      )
    }

    // Check if user is a member of the target organization
    const member = await db.members.findByOrgAndUser(organizationId, auth.user.id)
    if (!member || member.status !== "active") {
      return NextResponse.json(
        { success: false, error: "You are not a member of this organization" },
        { status: 403 }
      )
    }

    // Get the organization
    const organization = await db.organizations.findById(organizationId)
    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    // Create a new session for the target organization
    const sessionId = `sess_${crypto.randomUUID()}`
    const token = crypto.randomUUID()
    const expiresAt = new Date(
      Date.now() + CONFIG.auth.sessionDurationDays * 24 * 60 * 60 * 1000
    ).toISOString()

    await db.sessions.create({
      id: sessionId,
      userId: auth.user.id,
      organizationId,
      token,
      expiresAt,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      userAgent: request.headers.get("user-agent") || undefined,
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    })

    // Update user's last organization preference
    try {
      await db.userOrgPreferences.upsert({
        userId: auth.user.id,
        lastOrganizationId: organizationId,
      })
    } catch {
      // Preferences table might not exist yet
    }

    // Log the switch action
    try {
      await db.auditLogs.create({
        organizationId,
        userId: auth.user.id,
        action: "organization_switched",
        resourceType: "organization",
        resourceId: organizationId,
        metadata: {
          fromOrganizationId: auth.organization.id,
          toOrganizationId: organizationId,
        },
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      })
    } catch {
      // Audit log table might not exist yet
    }

    // Delete the old session (optional - can keep multiple sessions)
    // await db.sessions.delete(auth.sessionId)

    // Set the new session cookie
    const response = NextResponse.json({
      success: true,
      data: {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          settings: organization.settings,
          subscription: organization.subscription,
        },
        member: {
          id: member.id,
          role: member.role,
          department: member.department,
          status: member.status,
        },
        token,
        expiresAt,
      },
      message: `Switched to ${organization.name}`,
    })

    // Set the session cookie
    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
    })

    return response
  } catch (error) {
    console.error("Error switching organization:", error)
    return NextResponse.json(
      { success: false, error: "Failed to switch organization" },
      { status: 500 }
    )
  }
}
