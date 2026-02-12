/**
 * Audit Log Helper
 *
 * Lightweight, fire-and-forget audit logging for state-changing operations.
 * Captures who did what, to which resource, from where.
 *
 * Usage:
 *   await audit(auth, request, "member.removed", {
 *     resourceType: "member",
 *     resourceId: member.id,
 *     metadata: { reason: "admin action" },
 *   })
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { getClientIP } from "@/lib/auth/rate-limit"
import type { AuthContext } from "@/lib/auth/middleware"

interface AuditOptions {
  resourceType?: string
  resourceId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Log an audit event. Errors are swallowed to avoid disrupting the request.
 */
export function audit(
  auth: AuthContext,
  request: Request,
  action: string,
  options: AuditOptions = {}
): void {
  const ipAddress = getClientIP(request)
  const userAgent = request.headers.get("user-agent") || undefined

  // Fire-and-forget — never block the response
  db.auditLogs
    .create({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      action,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      oldValues: options.oldValues,
      newValues: options.newValues,
      ipAddress,
      userAgent,
      metadata: {
        ...options.metadata,
        isApiKey: auth.isApiKey || false,
      },
    })
    .catch((err) => {
      logger.debug(
        { error: err instanceof Error ? err.message : String(err), action },
        "Audit log write failed (non-critical)"
      )
    })
}
