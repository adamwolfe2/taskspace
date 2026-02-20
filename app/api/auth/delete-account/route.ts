import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { verifyPassword } from "@/lib/auth/password"
import { z } from "zod"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// Validation schema for delete account
const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required"),
  confirmationText: z.literal("delete my account", {
    errorMap: () => ({ message: 'You must type "delete my account" exactly to confirm' }),
  }),
})

// POST /api/auth/delete-account
//
// SAFETY: This route NEVER calls db.users.delete().
// The user entity is shared across all organizations.
// Instead, this removes the user from the CURRENT organization only.
// If the user has no remaining org memberships, we delete the user entity.
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { password } = await validateBody(request, deleteAccountSchema)

    // Get the user with password hash from database
    const user = await db.users.findById(auth.user.id)
    if (!user) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Incorrect password" },
        { status: 401 }
      )
    }

    // If sole owner with other members, block — they need to transfer ownership first
    if (auth.member.role === "owner") {
      const orgMembers = await db.members.findByOrganizationId(auth.organization.id)
      const ownerCount = orgMembers.filter(m => m.role === "owner").length
      if (ownerCount <= 1 && orgMembers.length > 1) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: "You are the only owner and other members exist. Transfer ownership or remove members first.",
          },
          { status: 400 }
        )
      }
    }

    // Log the action
    logger.info({
      userId: auth.user.id,
      email: auth.user.email,
      organizationId: auth.organization.id,
    }, "User leaving organization via delete account flow")

    // Remove user from CURRENT organization only
    await db.members.delete(auth.member.id, auth.organization.id)

    // Delete sessions for this org
    await db.sessions.deleteByUserAndOrg(auth.user.id, auth.organization.id)

    // Check if user has any remaining org memberships
    const remainingMemberships = await db.members.findByUserId(auth.user.id)

    if (remainingMemberships.length === 0) {
      // No remaining orgs — safe to delete user entity entirely
      logger.info({ userId: auth.user.id }, "User has no remaining memberships, deleting user entity")
      await db.users.delete(auth.user.id)
    }

    // Clear the session cookie
    const response = NextResponse.json<ApiResponse<null>>({
      success: true,
      message: remainingMemberships.length > 0
        ? "You have been removed from this organization."
        : "Your account has been permanently deleted.",
    })

    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    })

    return response
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Delete account error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    )
  }
})
