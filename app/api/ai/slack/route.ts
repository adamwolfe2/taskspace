import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import {
  sendSlackMessage,
  buildTaskAssignmentMessage,
  buildDailyDigestMessage,
  isSlackConfigured,
} from "@/lib/integrations/slack"
import type { ApiResponse, DailyDigest } from "@/lib/types"

// POST /api/ai/slack - Send a Slack notification
export async function POST(request: NextRequest) {
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
        { success: false, error: "Only admins can send Slack notifications" },
        { status: 403 }
      )
    }

    // Check if Slack is configured
    const webhookUrl = auth.organization.settings?.slackWebhookUrl
    if (!isSlackConfigured(webhookUrl)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Slack is not configured. Add a webhook URL in organization settings." },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { type, data } = body

    if (!type) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Notification type is required" },
        { status: 400 }
      )
    }

    let success = false

    switch (type) {
      case "task": {
        // Push a task assignment to Slack
        const { taskId } = data
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
        const { digestId } = data

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
        const { text } = data
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
    console.error("Slack notification error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send Slack notification" },
      { status: 500 }
    )
  }
}
