/**
 * Webhook Dispatcher
 *
 * Handles webhook event dispatching with:
 * - Signature verification
 * - Retry logic with exponential backoff
 * - Delivery tracking
 * - Rate limiting
 */

import crypto from "crypto"
import { db } from "@/lib/db"

// ============================================
// TYPES
// ============================================

export type WebhookEventType =
  | "task.created"
  | "task.updated"
  | "task.completed"
  | "task.deleted"
  | "rock.created"
  | "rock.updated"
  | "rock.completed"
  | "eod.submitted"
  | "eod.approved"
  | "member.joined"
  | "member.removed"

export interface WebhookPayload {
  id: string
  event: WebhookEventType
  timestamp: string
  organizationId: string
  data: Record<string, unknown>
}

interface WebhookConfig {
  id: string
  url: string
  secret: string
  headers: Record<string, string>
  enabled: boolean
  events: WebhookEventType[]
}

interface DeliveryResult {
  webhookId: string
  success: boolean
  statusCode?: number
  error?: string
  duration: number
}

// ============================================
// SIGNATURE GENERATION
// ============================================

function generateSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000)
  const signaturePayload = `${timestamp}.${payload}`
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex")

  return `t=${timestamp},v1=${signature}`
}

// ============================================
// WEBHOOK DISPATCHER CLASS
// ============================================

class WebhookDispatcher {
  private deliveryQueue: Map<string, NodeJS.Timeout> = new Map()
  private maxRetries = 3
  private retryDelays = [5000, 30000, 300000] // 5s, 30s, 5min

  /**
   * Dispatch a webhook event to all subscribed endpoints
   */
  async dispatch(
    organizationId: string,
    event: WebhookEventType,
    data: Record<string, unknown>
  ): Promise<DeliveryResult[]> {
    // Get all enabled webhooks for this org that subscribe to this event
    const webhooks = await db.sql`
      SELECT id, url, secret, headers, events
      FROM webhook_configs
      WHERE organization_id = ${organizationId}
        AND enabled = true
        AND events @> ${JSON.stringify([event])}::jsonb
    `

    if (webhooks.length === 0) {
      return []
    }

    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      organizationId,
      data,
    }

    const results: DeliveryResult[] = []

    for (const webhook of webhooks) {
      const result = await this.deliverToEndpoint(
        webhook as WebhookConfig,
        payload
      )
      results.push(result)
    }

    return results
  }

  /**
   * Deliver payload to a single webhook endpoint
   */
  private async deliverToEndpoint(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attempt = 1
  ): Promise<DeliveryResult> {
    const startTime = Date.now()
    const payloadString = JSON.stringify(payload)
    const signature = generateSignature(payloadString, webhook.secret)

    // Create delivery record
    const deliveryId = crypto.randomUUID()
    await db.sql`
      INSERT INTO webhook_deliveries (
        id,
        webhook_id,
        event_type,
        payload,
        status,
        attempt_count,
        created_at
      ) VALUES (
        ${deliveryId},
        ${webhook.id},
        ${payload.event},
        ${payloadString}::jsonb,
        'pending',
        ${attempt},
        NOW()
      )
    `

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": payload.event,
          "X-Webhook-Delivery": deliveryId,
          ...webhook.headers,
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      const duration = Date.now() - startTime
      const statusCode = response.status

      if (response.ok) {
        // Success - update delivery and webhook
        await db.sql`
          UPDATE webhook_deliveries
          SET status = 'success',
              response_status = ${statusCode},
              response_time_ms = ${duration},
              completed_at = NOW()
          WHERE id = ${deliveryId}
        `

        await db.sql`
          UPDATE webhook_configs
          SET last_triggered_at = NOW(),
              failure_count = 0
          WHERE id = ${webhook.id}
        `

        return {
          webhookId: webhook.id,
          success: true,
          statusCode,
          duration,
        }
      } else {
        // HTTP error - may retry
        throw new Error(`HTTP ${statusCode}`)
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      // Update delivery record
      await db.sql`
        UPDATE webhook_deliveries
        SET status = 'failed',
            error_message = ${errorMessage},
            response_time_ms = ${duration},
            completed_at = NOW()
        WHERE id = ${deliveryId}
      `

      // Increment failure count
      await db.sql`
        UPDATE webhook_configs
        SET failure_count = failure_count + 1
        WHERE id = ${webhook.id}
      `

      // Schedule retry if under max attempts
      if (attempt < this.maxRetries) {
        this.scheduleRetry(webhook, payload, attempt + 1)
      } else {
        // Max retries reached - disable if too many failures
        await this.checkAndDisableIfNeeded(webhook.id)
      }

      return {
        webhookId: webhook.id,
        success: false,
        error: errorMessage,
        duration,
      }
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private scheduleRetry(
    webhook: WebhookConfig,
    payload: WebhookPayload,
    attempt: number
  ): void {
    const delay = this.retryDelays[attempt - 2] || 300000 // Default 5min
    const retryKey = `${webhook.id}:${payload.id}`

    // Clear any existing retry for this delivery
    const existing = this.deliveryQueue.get(retryKey)
    if (existing) {
      clearTimeout(existing)
    }

    const timeout = setTimeout(async () => {
      this.deliveryQueue.delete(retryKey)
      await this.deliverToEndpoint(webhook, payload, attempt)
    }, delay)

    this.deliveryQueue.set(retryKey, timeout)
  }

  /**
   * Auto-disable webhooks with too many consecutive failures
   */
  private async checkAndDisableIfNeeded(webhookId: string): Promise<void> {
    const result = await db.sql`
      SELECT failure_count FROM webhook_configs
      WHERE id = ${webhookId}
    `

    if (result[0]?.failure_count >= 10) {
      await db.sql`
        UPDATE webhook_configs
        SET enabled = false
        WHERE id = ${webhookId}
      `

      console.warn(`Webhook ${webhookId} auto-disabled after 10 consecutive failures`)
    }
  }

  /**
   * Manually retry a failed delivery
   */
  async retryDelivery(deliveryId: string, organizationId: string): Promise<boolean> {
    const delivery = await db.sql`
      SELECT wd.*, wc.url, wc.secret, wc.headers, wc.enabled, wc.events
      FROM webhook_deliveries wd
      JOIN webhook_configs wc ON wd.webhook_id = wc.id
      WHERE wd.id = ${deliveryId}
        AND wc.organization_id = ${organizationId}
    `

    if (delivery.length === 0) {
      return false
    }

    const d = delivery[0]

    if (!d.enabled) {
      return false
    }

    const webhook: WebhookConfig = {
      id: d.webhook_id,
      url: d.url,
      secret: d.secret,
      headers: d.headers || {},
      enabled: d.enabled,
      events: d.events,
    }

    const payload: WebhookPayload = d.payload

    const result = await this.deliverToEndpoint(webhook, payload)
    return result.success
  }

  /**
   * Test a webhook configuration
   */
  async test(webhookId: string, organizationId: string): Promise<DeliveryResult> {
    const webhook = await db.sql`
      SELECT id, url, secret, headers, enabled, events
      FROM webhook_configs
      WHERE id = ${webhookId}
        AND organization_id = ${organizationId}
    `

    if (webhook.length === 0) {
      return {
        webhookId,
        success: false,
        error: "Webhook not found",
        duration: 0,
      }
    }

    const testPayload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: "task.created",
      timestamp: new Date().toISOString(),
      organizationId,
      data: {
        test: true,
        message: "This is a test webhook delivery",
      },
    }

    return this.deliverToEndpoint(webhook[0] as WebhookConfig, testPayload)
  }

  /**
   * Get pending deliveries count
   */
  getPendingCount(): number {
    return this.deliveryQueue.size
  }

  /**
   * Clear all pending retries (for shutdown)
   */
  clearPending(): void {
    for (const timeout of this.deliveryQueue.values()) {
      clearTimeout(timeout)
    }
    this.deliveryQueue.clear()
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const webhookDispatcher = new WebhookDispatcher()

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

export function dispatchWebhook(
  organizationId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<DeliveryResult[]> {
  return webhookDispatcher.dispatch(organizationId, event, data)
}

export function testWebhook(
  webhookId: string,
  organizationId: string
): Promise<DeliveryResult> {
  return webhookDispatcher.test(webhookId, organizationId)
}

export function retryWebhookDelivery(
  deliveryId: string,
  organizationId: string
): Promise<boolean> {
  return webhookDispatcher.retryDelivery(deliveryId, organizationId)
}
