/**
 * Notification Database Operations
 *
 * Standalone helper module for creating and managing notifications.
 * Provides a `sendNotification` function that other API routes can call
 * to create notifications for users.
 */

import { sql } from "@/lib/db/sql"
import { logger, logError } from "@/lib/logger"
import type { Notification, NotificationType } from "@/lib/types"

// ============================================
// TYPES
// ============================================

export interface SendNotificationParams {
  organizationId: string
  workspaceId?: string
  userId: string
  type: NotificationType
  title: string
  message?: string
  link?: string
  metadata?: Record<string, unknown>
}

// ============================================
// ROW PARSER
// ============================================

function parseNotificationRow(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: row.workspace_id as string | undefined,
    userId: row.user_id as string,
    type: row.type as NotificationType,
    title: row.title as string,
    message: (row.message as string) || "",
    link: row.link as string | undefined,
    read: row.read as boolean,
    readAt: row.read_at ? (row.read_at as Date).toISOString() : undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    actionUrl: row.action_url as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
  }
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Get notifications for a user, ordered by most recent first.
 */
export async function getForUser(
  userId: string,
  organizationId: string,
  options?: { limit?: number; unreadOnly?: boolean }
): Promise<Notification[]> {
  const limit = options?.limit ?? 20
  const unreadOnly = options?.unreadOnly ?? false

  const { rows } = unreadOnly
    ? await sql`
        SELECT * FROM notifications
        WHERE user_id = ${userId}
          AND organization_id = ${organizationId}
          AND read = FALSE
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql`
        SELECT * FROM notifications
        WHERE user_id = ${userId}
          AND organization_id = ${organizationId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `

  return rows.map(parseNotificationRow)
}

/**
 * Get unread notification count for a user.
 */
export async function getUnreadCount(
  userId: string,
  organizationId: string
): Promise<number> {
  const { rows } = await sql`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ${userId}
      AND organization_id = ${organizationId}
      AND read = FALSE
  `
  return parseInt(rows[0]?.count as string || "0", 10)
}

/**
 * Create a notification record in the database.
 */
export async function create(params: SendNotificationParams): Promise<Notification> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const { rows } = await sql`
    INSERT INTO notifications (
      id, organization_id, workspace_id, user_id, type,
      title, message, link, read, metadata, created_at
    )
    VALUES (
      ${id},
      ${params.organizationId},
      ${params.workspaceId || null},
      ${params.userId},
      ${params.type},
      ${params.title},
      ${params.message || null},
      ${params.link || null},
      FALSE,
      ${JSON.stringify(params.metadata || {})},
      ${now}
    )
    RETURNING *
  `

  return parseNotificationRow(rows[0])
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(
  id: string,
  userId: string
): Promise<Notification | null> {
  const { rows } = await sql`
    UPDATE notifications
    SET read = TRUE, read_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `

  if (!rows[0]) return null
  return parseNotificationRow(rows[0])
}

/**
 * Mark all notifications as read for a user within an organization.
 * Returns the number of notifications updated.
 */
export async function markAllAsRead(
  userId: string,
  organizationId: string
): Promise<number> {
  const { rowCount } = await sql`
    UPDATE notifications
    SET read = TRUE, read_at = NOW()
    WHERE user_id = ${userId}
      AND organization_id = ${organizationId}
      AND read = FALSE
  `
  return rowCount ?? 0
}

// ============================================
// SEND NOTIFICATION HELPER
// ============================================

/**
 * Send a notification to a user.
 *
 * This is the primary entry point for other API routes to create notifications.
 * It handles all the database insertion and logging.
 *
 * @example
 * ```typescript
 * import { sendNotification } from "@/lib/db/notifications"
 *
 * await sendNotification({
 *   organizationId: auth.organization.id,
 *   workspaceId: "ws_123",
 *   userId: assignee.id,
 *   type: "task_assigned",
 *   title: "You were assigned a new task: Update landing page",
 *   message: "Assigned by John Doe",
 *   link: "/tasks?id=task_456",
 *   metadata: { taskId: "task_456", assignedBy: "user_789" },
 * })
 * ```
 */
export async function sendNotification(params: SendNotificationParams): Promise<void> {
  try {
    await create(params)
    logger.debug(
      {
        userId: params.userId,
        type: params.type,
        organizationId: params.organizationId,
      },
      "Notification sent"
    )
  } catch (error) {
    logError(logger, "Failed to send notification", error, {
      userId: params.userId,
      type: params.type,
      organizationId: params.organizationId,
    })
  }
}

/**
 * Send the same notification to multiple users.
 *
 * @example
 * ```typescript
 * await sendNotificationToMany({
 *   organizationId: auth.organization.id,
 *   userIds: teamMemberIds,
 *   type: "issue_created",
 *   title: "New issue added: Server latency spike",
 *   link: "/ids-board",
 * })
 * ```
 */
export async function sendNotificationToMany(params: {
  organizationId: string
  workspaceId?: string
  userIds: string[]
  type: NotificationType
  title: string
  message?: string
  link?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { userIds, ...rest } = params

  await Promise.allSettled(
    userIds.map((userId) =>
      sendNotification({ ...rest, userId })
    )
  )
}
