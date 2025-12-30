/**
 * Audit Logging System
 *
 * Provides comprehensive audit logging for security-sensitive operations,
 * compliance tracking, and debugging. Logs are stored in the database
 * and can be queried for reporting.
 */

import { sql } from "@vercel/postgres"

// ============================================
// AUDIT LOG TYPES
// ============================================

export type AuditAction =
  // Authentication
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_reset_request"
  | "auth.password_reset_complete"
  | "auth.session_expired"
  | "auth.login_failed"
  // Organization
  | "organization.create"
  | "organization.update"
  | "organization.settings_update"
  | "organization.delete"
  // Members
  | "member.invite"
  | "member.accept_invitation"
  | "member.update"
  | "member.remove"
  | "member.role_change"
  | "member.status_change"
  // Tasks
  | "task.create"
  | "task.update"
  | "task.delete"
  | "task.complete"
  | "task.assign"
  | "task.bulk_operation"
  // Rocks
  | "rock.create"
  | "rock.update"
  | "rock.delete"
  | "rock.complete"
  | "rock.milestone_update"
  // EOD Reports
  | "eod.submit"
  | "eod.update"
  | "eod.escalation"
  // API Keys
  | "api_key.create"
  | "api_key.delete"
  | "api_key.use"
  // Integrations
  | "integration.asana_sync"
  | "integration.slack_message"
  | "integration.webhook_send"
  // AI
  | "ai.brain_dump"
  | "ai.query"
  | "ai.task_generate"
  | "ai.digest_generate"
  // Export
  | "export.data"
  | "export.calendar"
  // Admin
  | "admin.user_impersonate"
  | "admin.data_access"
  // Security
  | "security.rate_limit_exceeded"
  | "security.suspicious_activity"
  | "security.permission_denied"

export type AuditSeverity = "info" | "warning" | "error" | "critical"

export interface AuditLogEntry {
  id?: string
  organizationId: string | null
  userId: string | null
  action: AuditAction
  severity: AuditSeverity
  resourceType?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp?: string
}

export interface AuditLogFilters {
  organizationId?: string
  userId?: string
  action?: AuditAction | AuditAction[]
  severity?: AuditSeverity | AuditSeverity[]
  resourceType?: string
  resourceId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

// ============================================
// AUDIT LOGGER CLASS
// ============================================

class AuditLogger {
  private static instance: AuditLogger
  private queue: AuditLogEntry[] = []
  private flushInterval: NodeJS.Timeout | null = null
  private readonly batchSize = 10
  private readonly flushIntervalMs = 5000

  private constructor() {
    this.startFlushInterval()
  }

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  /**
   * Logs an audit event
   * Events are batched and flushed periodically for performance
   */
  public async log(entry: AuditLogEntry): Promise<void> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
    }

    this.queue.push(fullEntry)

    // Flush immediately if queue is full or if it's a critical event
    if (this.queue.length >= this.batchSize || entry.severity === "critical") {
      await this.flush()
    }
  }

  /**
   * Logs an event immediately without batching
   * Use for critical security events that must be persisted immediately
   */
  public async logImmediate(entry: AuditLogEntry): Promise<void> {
    try {
      await this.insertLog({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to write immediate audit log:", error)
      // Fall back to queue
      this.queue.push(entry)
    }
  }

  /**
   * Flushes the queue to the database
   */
  public async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const entries = [...this.queue]
    this.queue = []

    try {
      await Promise.all(entries.map((entry) => this.insertLog(entry)))
    } catch (error) {
      console.error("Failed to flush audit logs:", error)
      // Re-queue failed entries
      this.queue.unshift(...entries)
    }
  }

  /**
   * Inserts a single log entry into the database
   */
  private async insertLog(entry: AuditLogEntry): Promise<void> {
    try {
      await sql`
        INSERT INTO audit_logs (
          organization_id,
          user_id,
          action,
          severity,
          resource_type,
          resource_id,
          metadata,
          ip_address,
          user_agent,
          created_at
        ) VALUES (
          ${entry.organizationId},
          ${entry.userId},
          ${entry.action},
          ${entry.severity},
          ${entry.resourceType || null},
          ${entry.resourceId || null},
          ${JSON.stringify(entry.metadata || {})},
          ${entry.ipAddress || null},
          ${entry.userAgent || null},
          ${entry.timestamp || new Date().toISOString()}
        )
      `
    } catch (error) {
      // If table doesn't exist yet, log to console
      console.error("Audit log entry:", JSON.stringify(entry))
    }
  }

  /**
   * Queries audit logs with filters
   */
  public async query(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    const conditions: string[] = []
    const values: unknown[] = []
    let paramIndex = 1

    if (filters.organizationId) {
      conditions.push(`organization_id = $${paramIndex++}`)
      values.push(filters.organizationId)
    }

    if (filters.userId) {
      conditions.push(`user_id = $${paramIndex++}`)
      values.push(filters.userId)
    }

    if (filters.action) {
      const actions = Array.isArray(filters.action) ? filters.action : [filters.action]
      conditions.push(`action = ANY($${paramIndex++})`)
      values.push(actions)
    }

    if (filters.severity) {
      const severities = Array.isArray(filters.severity) ? filters.severity : [filters.severity]
      conditions.push(`severity = ANY($${paramIndex++})`)
      values.push(severities)
    }

    if (filters.resourceType) {
      conditions.push(`resource_type = $${paramIndex++}`)
      values.push(filters.resourceType)
    }

    if (filters.resourceId) {
      conditions.push(`resource_id = $${paramIndex++}`)
      values.push(filters.resourceId)
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`)
      values.push(filters.startDate)
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`)
      values.push(filters.endDate)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
    const limit = filters.limit || 100
    const offset = filters.offset || 0

    try {
      const result = await sql.query(
        `SELECT * FROM audit_logs ${whereClause} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        values
      )

      return result.rows.map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        userId: row.user_id,
        action: row.action as AuditAction,
        severity: row.severity as AuditSeverity,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        metadata: row.metadata,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        timestamp: row.created_at?.toISOString(),
      }))
    } catch (error) {
      console.error("Failed to query audit logs:", error)
      return []
    }
  }

  private startFlushInterval(): void {
    if (typeof setInterval !== "undefined") {
      this.flushInterval = setInterval(() => {
        this.flush().catch(console.error)
      }, this.flushIntervalMs)
    }
  }

  public stopFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const auditLogger = AuditLogger.getInstance()

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Logs an authentication event
 */
export async function logAuthEvent(
  action: Extract<AuditAction, `auth.${string}`>,
  userId: string | null,
  metadata?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await auditLogger.log({
    organizationId: null,
    userId,
    action,
    severity: action === "auth.login_failed" ? "warning" : "info",
    resourceType: "user",
    resourceId: userId || undefined,
    metadata,
    ipAddress: request?.headers.get("x-forwarded-for") || undefined,
    userAgent: request?.headers.get("user-agent") || undefined,
  })
}

/**
 * Logs a task-related event
 */
export async function logTaskEvent(
  action: Extract<AuditAction, `task.${string}`>,
  organizationId: string,
  userId: string,
  taskId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLogger.log({
    organizationId,
    userId,
    action,
    severity: "info",
    resourceType: "task",
    resourceId: taskId,
    metadata,
  })
}

/**
 * Logs a rock-related event
 */
export async function logRockEvent(
  action: Extract<AuditAction, `rock.${string}`>,
  organizationId: string,
  userId: string,
  rockId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLogger.log({
    organizationId,
    userId,
    action,
    severity: "info",
    resourceType: "rock",
    resourceId: rockId,
    metadata,
  })
}

/**
 * Logs a security event (always logged immediately)
 */
export async function logSecurityEvent(
  action: Extract<AuditAction, `security.${string}`>,
  organizationId: string | null,
  userId: string | null,
  metadata?: Record<string, unknown>,
  request?: Request
): Promise<void> {
  await auditLogger.logImmediate({
    organizationId,
    userId,
    action,
    severity: action === "security.suspicious_activity" ? "critical" : "warning",
    metadata,
    ipAddress: request?.headers.get("x-forwarded-for") || undefined,
    userAgent: request?.headers.get("user-agent") || undefined,
  })
}

/**
 * Logs an integration event
 */
export async function logIntegrationEvent(
  action: Extract<AuditAction, `integration.${string}`>,
  organizationId: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLogger.log({
    organizationId,
    userId,
    action,
    severity: "info",
    resourceType: "integration",
    metadata,
  })
}

/**
 * Logs an export event
 */
export async function logExportEvent(
  action: Extract<AuditAction, `export.${string}`>,
  organizationId: string,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await auditLogger.log({
    organizationId,
    userId,
    action,
    severity: "info",
    resourceType: "export",
    metadata,
  })
}
