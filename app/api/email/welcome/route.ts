import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { sendWelcomeEmail } from "@/lib/integrations/email"
import { logger, formatError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * POST /api/email/welcome
 * Send the welcome email to the current authenticated user.
 * Called from setup-organization-page after wizard completion.
 */
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json().catch(() => ({}))
    const organizationName = body.organizationName || `${auth.user.name}'s Workspace`
    const workspaceName = body.workspaceName || "Default"

    await sendWelcomeEmail({
      to: auth.user.email,
      name: auth.user.name,
      organizationName,
      workspaceName,
    })

    return NextResponse.json<ApiResponse<null>>({ success: true, data: null })
  } catch (error) {
    logger.warn({ userId: auth.user.id, error: formatError(error) }, "Failed to send welcome email via API")
    // Return success to not block the onboarding flow
    return NextResponse.json<ApiResponse<null>>({ success: true, data: null })
  }
})
