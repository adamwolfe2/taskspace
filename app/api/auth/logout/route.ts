import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session_token")?.value

    if (sessionToken) {
      await db.sessions.deleteByToken(sessionToken)
    }

    const response = NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Logged out successfully",
    })

    // Clear cookie
    response.cookies.set("session_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: new Date(0),
      path: "/",
    })

    return response
  } catch (error) {
    logError(logger, "Logout error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "An error occurred during logout" },
      { status: 500 }
    )
  }
}
