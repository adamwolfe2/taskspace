import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

/**
 * POST /api/slack/oauth
 * Start Slack OAuth flow - generates the authorization URL
 * Admin only - only admins can install the Slack bot
 */
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    const clientId = process.env.SLACK_CLIENT_ID
    if (!clientId) {
      logger.error("SLACK_CLIENT_ID not configured")
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Slack integration is not configured" },
        { status: 503 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appUrl) {
      logger.error("NEXT_PUBLIC_APP_URL not configured")
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Application URL is not configured" },
        { status: 503 }
      )
    }

    // Generate state param with org context and timestamp for CSRF protection
    const state = Buffer.from(
      JSON.stringify({
        orgId: auth.organization.id,
        userId: auth.user.id,
        ts: Date.now(),
      })
    ).toString("base64url")

    // Build Slack OAuth URL
    const scopes = "chat:write,im:write,im:history,im:read,users:read,users:read.email"
    const redirectUri = `${appUrl}/api/slack/oauth/callback`

    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
    })

    const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`

    logger.info(
      { orgId: auth.organization.id, userId: auth.user.id },
      "Slack OAuth flow initiated"
    )

    return NextResponse.json<ApiResponse<{ url: string }>>({
      success: true,
      data: { url: slackOAuthUrl },
    })
  } catch (error) {
    logError(logger, "Slack OAuth initiation error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to initiate Slack OAuth" },
      { status: 500 }
    )
  }
})
