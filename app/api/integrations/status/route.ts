import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"

interface IntegrationStatus {
  email: {
    configured: boolean
    provider: string
    fromAddress: string | null
  }
  slack: {
    configured: boolean
    webhookSet: boolean
  }
  ai: {
    configured: boolean
    provider: string
  }
}

// GET /api/integrations/status - Get integration status
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can view integration status" },
        { status: 403 }
      )
    }

    // Check email configuration
    const resendApiKey = process.env.RESEND_API_KEY
    const emailFrom = process.env.EMAIL_FROM
    const emailConfigured = !!resendApiKey && resendApiKey.startsWith("re_")

    // Check Slack configuration
    const slackEnabled = auth.organization.settings.enableSlackIntegration || false
    const slackWebhook = auth.organization.settings.slackWebhookUrl || ""
    const slackConfigured = slackEnabled && slackWebhook.startsWith("https://hooks.slack.com/")

    // Check AI configuration
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const aiConfigured = !!anthropicKey && anthropicKey.startsWith("sk-ant-")

    const status: IntegrationStatus = {
      email: {
        configured: emailConfigured,
        provider: "Resend",
        fromAddress: emailConfigured ? (emailFrom || "Not set") : null,
      },
      slack: {
        configured: slackConfigured,
        webhookSet: !!slackWebhook,
      },
      ai: {
        configured: aiConfigured,
        provider: "Anthropic Claude",
      },
    }

    return NextResponse.json<ApiResponse<IntegrationStatus>>({
      success: true,
      data: status,
    })
  } catch (error) {
    console.error("Get integration status error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get integration status" },
      { status: 500 }
    )
  }
}
