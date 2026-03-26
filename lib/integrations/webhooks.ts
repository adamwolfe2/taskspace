/**
 * Custom Webhook Integration
 * Allows sending notifications to external systems via webhooks
 */

import { logger, logError } from "@/lib/logger"
import { validateWebhookUrl } from "@/lib/validation/url"

export interface WebhookPayload {
  event: string
  timestamp: string
  organizationId: string
  data: Record<string, unknown>
}

export interface WebhookConfig {
  url: string
  secret?: string
  events: string[]
}

// Available webhook events
export const WEBHOOK_EVENTS = {
  TASK_CREATED: "task.created",
  TASK_COMPLETED: "task.completed",
  TASK_ASSIGNED: "task.assigned",
  EOD_SUBMITTED: "eod.submitted",
  EOD_ESCALATION: "eod.escalation",
  ROCK_CREATED: "rock.created",
  ROCK_UPDATED: "rock.updated",
  ROCK_COMPLETED: "rock.completed",
  MILESTONE_COMPLETED: "milestone.completed",
  DAILY_DIGEST: "daily.digest",
} as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[keyof typeof WEBHOOK_EVENTS]

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const data = encoder.encode(payload)

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Send a webhook notification to an external system
 */
export async function sendWebhook(
  config: WebhookConfig,
  event: WebhookEvent,
  organizationId: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Check if this event is enabled for this webhook
  if (!config.events.includes(event)) {
    return { success: true } // Silently skip disabled events
  }

  // Defense-in-depth: re-validate the URL at dispatch time to catch any
  // URLs that were stored before SSRF validation was added.
  if (!isValidWebhookUrl(config.url)) {
    logger.warn({ url: config.url }, "Webhook URL blocked by SSRF validation")
    return { success: false, error: "Webhook URL is not allowed (private/internal target)" }
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    organizationId,
    data,
  }

  const payloadString = JSON.stringify(payload)

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": event,
    "X-Webhook-Timestamp": payload.timestamp,
  }

  // Add signature if secret is configured
  if (config.secret) {
    const signature = await generateSignature(payloadString, config.secret)
    headers["X-Webhook-Signature"] = `sha256=${signature}`
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      logger.error({ status: response.status, errorText }, "Webhook delivery failed")
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    return { success: true }
  } catch (error) {
    logError(logger, "Webhook delivery error", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

/**
 * Build webhook payload for task created event
 */
export function buildTaskCreatedPayload(task: {
  id: string
  title: string
  description?: string
  assigneeId: string
  assigneeName?: string
  priority: string
  dueDate: string
  type: string
}): Record<string, unknown> {
  return {
    taskId: task.id,
    title: task.title,
    description: task.description,
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
    priority: task.priority,
    dueDate: task.dueDate,
    type: task.type,
  }
}

/**
 * Build webhook payload for task completed event
 */
export function buildTaskCompletedPayload(task: {
  id: string
  title: string
  assigneeId: string
  assigneeName?: string
  completedAt: string
}): Record<string, unknown> {
  return {
    taskId: task.id,
    title: task.title,
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
    completedAt: task.completedAt,
  }
}

/**
 * Build webhook payload for EOD submitted event
 */
export function buildEODSubmittedPayload(report: {
  id: string
  userId: string
  userName?: string
  date: string
  tasksCompleted: number
  needsEscalation: boolean
}): Record<string, unknown> {
  return {
    reportId: report.id,
    userId: report.userId,
    userName: report.userName,
    date: report.date,
    tasksCompleted: report.tasksCompleted,
    needsEscalation: report.needsEscalation,
  }
}

/**
 * Build webhook payload for rock events
 */
export function buildRockPayload(rock: {
  id: string
  title: string
  userId: string
  userName?: string
  status: string
  progress: number
  quarter?: string
}): Record<string, unknown> {
  return {
    rockId: rock.id,
    title: rock.title,
    userId: rock.userId,
    userName: rock.userName,
    status: rock.status,
    progress: rock.progress,
    quarter: rock.quarter,
  }
}

/**
 * Validate webhook URL format.
 *
 * Enforces HTTPS-only and blocks private/internal network targets to
 * prevent SSRF attacks.
 */
export function isValidWebhookUrl(url: string): boolean {
  return validateWebhookUrl(url) !== null
}
