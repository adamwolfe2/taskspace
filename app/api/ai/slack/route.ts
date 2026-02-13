import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import {
  sendSlackMessage,
  buildTaskAssignmentMessage,
  buildDailyDigestMessage,
  isSlackConfigured,
} from "@/lib/integrations/slack"
import { aiRateLimit } from "@/lib/api/rate-limit"
import type { ApiResponse, DailyDigest } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { aiSlackNotificationSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// POST /api/ai/slack - Send a Slack notification
export const POST = withAdmin(async (request: NextRequest, auth) => {
  try {
    // Rate limit: 20 Slack notifications per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'slack')
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { type, data, workspaceId } = await validateBody(request, aiSlackNotificationSchema)

    // Validate workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
          { status: 404 }
      )
    }

    // Get workspace for workspace-specific Slack webhook
    const workspace = await db.workspaces.findById(workspaceId)
    if (!workspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check if Slack is configured for this workspace (or fallback to org level)
    const wsSettings = workspace.settings as Record<string, unknown>
    const webhookUrl = (wsSettings?.slackWebhookUrl as string | undefined) || auth.organization.settings?.slackWebhookUrl
    if (!isSlackConfigured(webhookUrl)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Slack is not configured for this workspace. Add a webhook URL in workspace settings." },
        { status: 400 }
      )
    }

    let success = false

    switch (type) {
      case "task": {
        // Push a task assignment to Slack
        const taskId = data.taskId as string | undefined
        if (!taskId) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Task ID is required" },
            { status: 400 }
          )
        }

        // Get the AI generated task
        const tasks = await db.aiGeneratedTasks.findByOrganizationId(auth.organization.id)
        const task = tasks.find(t => t.id === taskId)

        if (!task) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Task not found" },
            { status: 404 }
          )
        }

        const message = buildTaskAssignmentMessage(
          task.assigneeName || "Unknown",
          task.title,
          task.description,
          task.priority,
          task.dueDate || "Not set",
          auth.user.name,
          task.context
        )

        success = await sendSlackMessage(webhookUrl!, message)

        if (success) {
          // Update task to mark as pushed to Slack
          await db.aiGeneratedTasks.update(taskId, {
            pushedToSlack: true,
            pushedAt: new Date().toISOString(),
          })
        }
        break
      }

      case "digest": {
        // Push daily digest to Slack
        const digestId = data.digestId as string | undefined

        let digest: DailyDigest | null = null
        if (digestId) {
          const digests = await db.dailyDigests.findByOrganizationId(auth.organization.id)
          digest = digests.find(d => d.id === digestId) || null
        } else {
          digest = await db.dailyDigests.getLatest(auth.organization.id)
        }

        if (!digest) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Digest not found" },
            { status: 404 }
          )
        }

        const message = buildDailyDigestMessage(
          digest.digestDate,
          digest.summary,
          digest.wins?.length || 0,
          digest.blockers?.length || 0,
          digest.teamSentiment,
          digest.reportsAnalyzed
        )

        success = await sendSlackMessage(webhookUrl!, message)
        break
      }

      case "custom": {
        // Send a custom message
        const text = data.text as string | undefined
        if (!text) {
          return NextResponse.json<ApiResponse<null>>(
            { success: false, error: "Message text is required" },
            { status: 400 }
          )
        }

        success = await sendSlackMessage(webhookUrl!, { text })
        break
      }

      default:
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Unknown notification type: ${type}` },
          { status: 400 }
        )
    }

    if (!success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to send Slack notification" },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse<{ sent: boolean }>>({
      success: true,
      data: { sent: true },
      message: "Slack notification sent successfully",
    })
  } catch (error) {
    logError(logger, "Slack notification error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send Slack notification" },
      { status: 500 }
    )
  }
})
