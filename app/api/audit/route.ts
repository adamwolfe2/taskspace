/**
 * Audit Log API
 *
 * Provides access to audit trail for compliance and security monitoring:
 * - Query audit logs with filters
 * - Export audit data
 * - Real-time audit event streaming
 */

import { NextRequest } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import { Errors, paginatedResponse, successResponse } from "@/lib/api/errors"
import { z } from "zod"
import { logger, logError } from "@/lib/logger"

// ============================================
// VALIDATION SCHEMAS
// ============================================

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().optional(),
  actorId: z.string().uuid().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  severity: z.enum(["info", "warning", "error", "critical"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(200).optional(),
})

// ============================================
// GET - Query Audit Logs
// ============================================

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    // Only admins and owners can view audit logs
    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return Errors.insufficientPermissions("view audit logs").toResponse()
    }

    // Parse query params with defaults
    const searchParams = new URL(request.url).searchParams
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)))
    const action = searchParams.get("action")
    const actorId = searchParams.get("actorId")
    const resourceType = searchParams.get("resourceType")
    const resourceId = searchParams.get("resourceId")
    const severity = searchParams.get("severity")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const search = searchParams.get("search")

    const offset = (page - 1) * limit

    // Use parameterized queries to prevent SQL injection
    // Build conditions array and values for dynamic WHERE clause
    const { rows: logs } = await sql`
      SELECT
        id,
        action,
        actor_id,
        actor_type,
        resource_type,
        resource_id,
        details,
        ip_address,
        user_agent,
        severity,
        created_at
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND (${action}::text IS NULL OR action = ${action})
        AND (${actorId}::uuid IS NULL OR actor_id = ${actorId}::uuid)
        AND (${resourceType}::text IS NULL OR resource_type = ${resourceType})
        AND (${resourceId}::text IS NULL OR resource_id = ${resourceId})
        AND (${severity}::text IS NULL OR severity = ${severity})
        AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
        AND (${search}::text IS NULL OR (
          action ILIKE '%' || ${search} || '%' OR
          resource_type ILIKE '%' || ${search} || '%' OR
          details::text ILIKE '%' || ${search} || '%'
        ))
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get total count with same filters
    const { rows: countResult } = await sql`
      SELECT COUNT(*) as total
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND (${action}::text IS NULL OR action = ${action})
        AND (${actorId}::uuid IS NULL OR actor_id = ${actorId}::uuid)
        AND (${resourceType}::text IS NULL OR resource_type = ${resourceType})
        AND (${resourceId}::text IS NULL OR resource_id = ${resourceId})
        AND (${severity}::text IS NULL OR severity = ${severity})
        AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
        AND (${search}::text IS NULL OR (
          action ILIKE '%' || ${search} || '%' OR
          resource_type ILIKE '%' || ${search} || '%' OR
          details::text ILIKE '%' || ${search} || '%'
        ))
    `
    const total = parseInt(countResult[0]?.total || "0", 10)

    // Format response
    const formattedLogs = logs.map((log: Record<string, unknown>) => ({
      id: log.id,
      action: log.action,
      actorId: log.actor_id,
      actorType: log.actor_type,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      severity: log.severity,
      createdAt: log.created_at,
    }))

    return paginatedResponse(formattedLogs, total, page, limit)
  } catch (error) {
    logError(logger, "Audit log query error", error)
    return Errors.internal().toResponse()
  }
}

// ============================================
// Audit Log Summary Statistics
// ============================================

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return Errors.unauthorized().toResponse()
    }

    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return Errors.insufficientPermissions("view audit statistics").toResponse()
    }

    const body = await request.json()
    const { startDate, endDate } = body

    // Get activity summary
    const { rows: activityByAction } = await sql`
      SELECT
        action,
        COUNT(*) as count,
        COUNT(DISTINCT actor_id) as unique_actors
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
      GROUP BY action
      ORDER BY count DESC
      LIMIT 20
    `

    // Get activity by severity
    const { rows: activityBySeverity } = await sql`
      SELECT
        severity,
        COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
      GROUP BY severity
    `

    // Get daily activity for the period
    const { rows: dailyActivity } = await sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `

    // Get top actors
    const { rows: topActors } = await sql`
      SELECT
        actor_id,
        COUNT(*) as action_count
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND actor_id IS NOT NULL
        AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
      GROUP BY actor_id
      ORDER BY action_count DESC
      LIMIT 10
    `

    // Get security events
    const { rows: securityEvents } = await sql`
      SELECT
        action,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND action LIKE 'security.%'
        AND (${startDate}::date IS NULL OR created_at >= ${startDate}::date)
        AND (${endDate}::date IS NULL OR created_at < ${endDate}::date + interval '1 day')
      GROUP BY action
      ORDER BY count DESC
    `

    return successResponse({
      summary: {
        byAction: activityByAction,
        bySeverity: activityBySeverity,
        dailyActivity,
        topActors,
        securityEvents,
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    })
  } catch (error) {
    logError(logger, "Audit statistics error", error)
    return Errors.internal().toResponse()
  }
}
