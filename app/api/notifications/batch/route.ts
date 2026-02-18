import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sendNotificationToMany } from "@/lib/db/notifications"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse, NotificationType } from "@/lib/types"
import { z } from "zod"
import { validateBody, ValidationError } from "@/lib/validation/middleware"

const batchNotificationSchema = z.object({
  organizationId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1).max(100),
  notification: z.object({
    type: z.enum([
      "task_assigned", "task_completed", "rock_updated", "eod_reminder",
      "escalation", "invitation", "mention", "meeting_starting", "issue_created", "system",
    ] as const),
    title: z.string().min(1).max(255),
    message: z.string().max(1000).optional(),
    link: z.string().max(500).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
})

// POST /api/notifications/batch - Send notifications to multiple users (super admin only)
export const POST = withSuperAdmin(async (request: NextRequest) => {
  try {
    const { organizationId, userIds, notification } = await validateBody(request, batchNotificationSchema)

    await sendNotificationToMany({
      organizationId,
      userIds,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      metadata: notification.metadata,
    })

    logger.info(`Batch notification sent to ${userIds.length} users in org ${organizationId}`)

    return NextResponse.json<ApiResponse<{ sentCount: number }>>({
      success: true,
      data: { sentCount: userIds.length },
      message: `Sent ${userIds.length} notifications`,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Batch notification error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to send batch notifications" },
      { status: 500 }
    )
  }
})
