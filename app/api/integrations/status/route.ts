import { NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { withAdmin } from "@/lib/api/middleware"

interface IntegrationStatus {
  email: {
    configured: boolean
    provider: string
    fromAddress: string | null
    appUrl: string
    appUrlConfigured: boolean
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
export const GET = withAdmin(async (request, auth) => {
  try {
    // Check email configuration
    const resendApiKey = process.env.RESEND_API_KEY
    const emailFrom = process.env.EMAIL_FROM
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.trytaskspace.com"
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
        appUrl: appUrl,
        appUrlConfigured: !!process.env.NEXT_PUBLIC_APP_URL,
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
    logError(logger, "Get integration status error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get integration status" },
      { status: 500 }
    )
  }
})
