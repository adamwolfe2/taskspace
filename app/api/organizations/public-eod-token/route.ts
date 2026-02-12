/**
 * POST /api/organizations/public-eod-token
 * Generate or clear the public EOD access token.
 *
 * Body: { action: "generate" | "clear" }
 *   - "generate": Creates a new random token and stores it in org settings.
 *   - "clear": Removes the token, making the public endpoint open (slug-only).
 *
 * Returns the current publicEodToken (null if cleared).
 */

import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { generateToken } from "@/lib/auth/password"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse, OrganizationSettings } from "@/lib/types"

export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const body = await request.json()
    const action = body?.action

    if (action !== "generate" && action !== "clear") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "action must be 'generate' or 'clear'" },
        { status: 400 }
      )
    }

    const org = await db.organizations.findById(auth.organization.id)
    if (!org) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Organization not found" },
        { status: 404 }
      )
    }

    const newToken = action === "generate" ? generateToken() : null

    const updatedSettings = {
      ...org.settings,
      publicEodToken: newToken,
    }

    await db.organizations.update(auth.organization.id, {
      settings: updatedSettings as OrganizationSettings,
    })

    return NextResponse.json<ApiResponse<{ publicEodToken: string | null }>>({
      success: true,
      data: { publicEodToken: newToken },
    })
  } catch (error) {
    logError(logger, "Public EOD token update error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update public EOD token" },
      { status: 500 }
    )
  }
})
