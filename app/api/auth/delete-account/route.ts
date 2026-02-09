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

// POST /api/auth/delete-account - Delete the current user's account
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { password, confirmationText } = await validateBody(request, deleteAccountSchema)

    // Get the user with password hash
    const user = await db.users.findById(auth.user.id)
    if (!user || !user.password) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User not found or password not set" },
        { status: 404 }
      )
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Incorrect password" },
        { status: 401 }
      )
    }

    // Prevent owner from deleting account if they're the only owner
    if (auth.member.role === "owner") {
      const members = await db.members.findByOrganizationId(auth.organization.id)
      const ownerCount = members.filter(m => m.role === "owner").length
      if (ownerCount <= 1) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: "You are the only owner of this organization. Please transfer ownership or delete the organization first.",
          },
          { status: 400 }
        )
      }
    }

    // Log the deletion for audit purposes
    logger.info("User account deletion initiated", {
      userId: auth.user.id,
      email: auth.user.email,
      organizationId: auth.organization.id,
    })

    // Delete the user account (this should cascade to delete related data)
    await db.users.delete(auth.user.id)

    // Delete the member record from the organization
    await db.members.delete(auth.member.id, auth.organization.id)

    // Clear the session cookie
    const response = NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Your account has been permanently deleted",
    })

    // Clear auth cookie
    response.cookies.set("auth-token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
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

    logError(logger, "Delete account error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete account" },
      { status: 500 }
    )
  }
})
