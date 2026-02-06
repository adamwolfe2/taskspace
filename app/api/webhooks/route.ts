/**
 * Webhook Configuration API
 *
 * Manages webhook endpoints for external integrations:
 * - Create/update/delete webhook configurations
 * - Test webhook delivery
 * - View delivery history and retry failed deliveries
 */

import { NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { sql } from "@/lib/db/sql"
import { Errors, successResponse, paginatedResponse } from "@/lib/api/errors"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { logIntegrationEvent, logSecurityEvent } from "@/lib/audit/logger"
import { z } from "zod"
import crypto from "crypto"
import { logger, logError } from "@/lib/logger"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const webhookEventTypes = [
  "task.created",
  "task.updated",
  "task.completed",
  "task.deleted",
  "rock.created",
  "rock.updated",
  "rock.completed",
  "eod.submitted",
  "eod.approved",
  "member.joined",
  "member.removed",
] as const

const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(500),
  events: z.array(z.enum(webhookEventTypes)).min(1),
  secret: z.string().min(16).max(100).optional(),
  headers: z.record(z.string()).optional(),
  enabled: z.boolean().default(true),
  workspaceId: z.string().optional(), // NULL = org-wide, otherwise workspace-specific
})

const updateWebhookSchema = createWebhookSchema.partial().extend({
  regenerateSecret: z.boolean().optional(),
})

// ============================================
// HELPERS
// ============================================

function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(32).toString("hex")}`
}

function maskSecret(secret: string): string {
  if (secret.length <= 12) return "****"
  return secret.substring(0, 8) + "****" + secret.substring(secret.length - 4)
}

// ============================================
// GET - List Webhooks
// ============================================

export const GET = withAdmin(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // Build query to get org-wide webhooks OR workspace-specific webhooks
    let webhooks: Record<string, unknown>[]
    if (workspaceId) {
      // Get org-wide (NULL) + workspace-specific webhooks
      const { rows } = await sql`
        SELECT
          id,
          name,
          url,
          events,
          secret,
          headers,
          enabled,
          workspace_id,
          last_triggered_at,
          failure_count,
          created_at,
          updated_at
        FROM webhook_configs
        WHERE organization_id = ${auth.organization.id}
          AND (workspace_id IS NULL OR workspace_id = ${workspaceId})
        ORDER BY created_at DESC
      `
      webhooks = rows
    } else {
      // Get all webhooks for org
      const { rows } = await sql`
        SELECT
          id,
          name,
          url,
          events,
          secret,
          headers,
          enabled,
          workspace_id,
          last_triggered_at,
          failure_count,
          created_at,
          updated_at
        FROM webhook_configs
        WHERE organization_id = ${auth.organization.id}
        ORDER BY created_at DESC
      `
      webhooks = rows
    }

    // Get recent delivery stats for each webhook
    const webhookIds = webhooks.map((w: Record<string, unknown>) => w.id)

    let deliveryStats: Record<string, unknown>[] = []
    if (webhookIds.length > 0) {
      const { rows } = await sql`
        SELECT
          webhook_id,
          COUNT(*) as total_deliveries,
          COUNT(*) FILTER (WHERE status = 'success') as successful,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending
        FROM webhook_deliveries
        WHERE webhook_id = ANY(string_to_array(${webhookIds.join(',')}, ','))
          AND created_at > NOW() - INTERVAL '7 days'
        GROUP BY webhook_id
      `
      deliveryStats = rows
    }

    const statsMap = new Map(
      deliveryStats.map((s: Record<string, unknown>) => [s.webhook_id, s])
    )

    const formattedWebhooks = webhooks.map((webhook: Record<string, unknown>) => ({
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      secret: maskSecret(webhook.secret as string),
      headers: webhook.headers,
      enabled: webhook.enabled,
      workspaceId: webhook.workspace_id || null,
      scope: webhook.workspace_id ? 'workspace' : 'organization',
      lastTriggeredAt: webhook.last_triggered_at,
      failureCount: webhook.failure_count,
      deliveryStats: statsMap.get(webhook.id) || {
        total_deliveries: 0,
        successful: 0,
        failed: 0,
        pending: 0,
      },
      createdAt: webhook.created_at,
      updatedAt: webhook.updated_at,
    }))

    return successResponse({ webhooks: formattedWebhooks })
  } catch (error) {
    logError(logger, "Webhook list error", error)
    return Errors.internal().toResponse()
  }
})

// ============================================
// POST - Create Webhook
// ============================================

export const POST = withAdmin(async (request, auth) => {
  try {
    const body = await validateBody(request, createWebhookSchema)

    // Check webhook limit (max 10 per org)
    const { rows: existingCount } = await sql`
      SELECT COUNT(*) as count
      FROM webhook_configs
      WHERE organization_id = ${auth.organization.id}
    `

    if (parseInt(String(existingCount[0]?.count || "0"), 10) >= 10) {
      return Errors.validationError("Maximum webhook limit (10) reached").toResponse()
    }

    const secret = body.secret || generateWebhookSecret()
    const id = crypto.randomUUID()

    await sql`
      INSERT INTO webhook_configs (
        id,
        organization_id,
        workspace_id,
        name,
        url,
        events,
        secret,
        headers,
        enabled,
        failure_count,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${auth.organization.id},
        ${body.workspaceId || null},
        ${body.name},
        ${body.url},
        ${JSON.stringify(body.events)},
        ${secret},
        ${JSON.stringify(body.headers || {})},
        ${body.enabled},
        0,
        NOW(),
        NOW()
      )
    `

    await logIntegrationEvent(
      "integration.webhook_created",
      auth.organization.id,
      auth.user.id,
      { webhookId: id, name: body.name, url: body.url, events: body.events }
    )

    return successResponse({
      webhook: {
        id,
        name: body.name,
        url: body.url,
        events: body.events,
        secret: maskSecret(secret),
        enabled: body.enabled,
        workspaceId: body.workspaceId || null,
        scope: body.workspaceId ? 'workspace' : 'organization',
        createdAt: new Date().toISOString(),
      },
      message: "Webhook created successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Errors.validationError(error.message).toResponse()
    }
    logError(logger, "Webhook creation error", error)
    return Errors.internal().toResponse()
  }
})

// ============================================
// PATCH - Update Webhook
// ============================================

export const PATCH = withAdmin(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get("id")

    if (!webhookId) {
      return Errors.validationError("Webhook ID is required").toResponse()
    }

    const body = await validateBody(request, updateWebhookSchema)

    // Verify webhook belongs to org and check workspace access
    const { rows: existing } = await sql`
      SELECT id, secret, workspace_id FROM webhook_configs
      WHERE id = ${webhookId} AND organization_id = ${auth.organization.id}
    `

    if (existing.length === 0) {
      return Errors.notFound("Webhook").toResponse()
    }

    // If webhook is workspace-specific, validate access
    const webhook = existing[0]
    if (webhook.workspace_id) {
      const { userHasWorkspaceAccess } = await import("@/lib/db/workspaces")
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, webhook.workspace_id)
      if (!hasAccess && auth.member.role !== "admin" && auth.member.role !== "owner") {
        return Errors.insufficientPermissions("access this workspace webhook").toResponse()
      }
    }

    // Use parameterized update to prevent SQL injection
    let newSecret = existing[0].secret as string
    if (body.regenerateSecret) {
      newSecret = generateWebhookSecret()
    }

    // Build update with safe parameterized query
    await sql`
      UPDATE webhook_configs
      SET
        updated_at = NOW(),
        name = COALESCE(${body.name ?? null}, name),
        url = COALESCE(${body.url ?? null}, url),
        events = CASE WHEN ${body.events !== undefined} THEN ${body.events ? JSON.stringify(body.events) : null}::jsonb ELSE events END,
        headers = CASE WHEN ${body.headers !== undefined} THEN ${body.headers ? JSON.stringify(body.headers) : '{}'}::jsonb ELSE headers END,
        enabled = COALESCE(${body.enabled ?? null}, enabled),
        secret = ${body.regenerateSecret ? newSecret : existing[0].secret},
        failure_count = CASE WHEN ${body.regenerateSecret || false} THEN 0 ELSE failure_count END
      WHERE id = ${webhookId}
    `

    await logIntegrationEvent(
      "integration.webhook_updated",
      auth.organization.id,
      auth.user.id,
      { webhookId, updates: Object.keys(body) }
    )

    return successResponse({
      message: "Webhook updated successfully",
      secretRegenerated: body.regenerateSecret || false,
      newSecret: body.regenerateSecret ? maskSecret(newSecret) : undefined,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Errors.validationError(error.message).toResponse()
    }
    logError(logger, "Webhook update error", error)
    return Errors.internal().toResponse()
  }
})

// ============================================
// DELETE - Remove Webhook
// ============================================

export const DELETE = withAdmin(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get("id")

    if (!webhookId) {
      return Errors.validationError("Webhook ID is required").toResponse()
    }

    // Verify webhook belongs to org and check workspace access
    const { rows: existingWebhook } = await sql`
      SELECT id, name, workspace_id FROM webhook_configs
      WHERE id = ${webhookId} AND organization_id = ${auth.organization.id}
    `

    if (existingWebhook.length === 0) {
      return Errors.notFound("Webhook").toResponse()
    }

    // If webhook is workspace-specific, validate access
    const webhook = existingWebhook[0]
    if (webhook.workspace_id) {
      const { userHasWorkspaceAccess } = await import("@/lib/db/workspaces")
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, webhook.workspace_id)
      if (!hasAccess && auth.member.role !== "admin" && auth.member.role !== "owner") {
        return Errors.insufficientPermissions("access this workspace webhook").toResponse()
      }
    }

    // Delete associated deliveries first
    await sql`
      DELETE FROM webhook_deliveries
      WHERE webhook_id = ${webhookId}
    `

    // Delete webhook
    await sql`
      DELETE FROM webhook_configs
      WHERE id = ${webhookId}
    `

    await logIntegrationEvent(
      "integration.webhook_deleted",
      auth.organization.id,
      auth.user.id,
      { webhookId, name: existingWebhook[0].name }
    )

    return successResponse({
      message: "Webhook deleted successfully",
    })
  } catch (error) {
    logError(logger, "Webhook deletion error", error)
    return Errors.internal().toResponse()
  }
})
