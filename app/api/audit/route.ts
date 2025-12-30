/**
 * Audit Log API
 *
 * Provides access to audit trail for compliance and security monitoring:
 * - Query audit logs with filters
 * - Export audit data
 * - Real-time audit event streaming
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { Errors, successResponse, paginatedResponse } from "@/lib/api/errors"
import { validateQuery } from "@/lib/validation/middleware"
import { z } from "zod"

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

    const query = validateQuery(request, auditQuerySchema)
    const { page, limit, action, actorId, resourceType, resourceId, severity, startDate, endDate, search } = query

    const offset = (page - 1) * limit

    // Build dynamic query
    const conditions: string[] = [`organization_id = '${auth.organization.id}'`]

    if (action) {
      conditions.push(`action = '${action}'`)
    }
    if (actorId) {
      conditions.push(`actor_id = '${actorId}'`)
    }
    if (resourceType) {
      conditions.push(`resource_type = '${resourceType}'`)
    }
    if (resourceId) {
      conditions.push(`resource_id = '${resourceId}'`)
    }
    if (severity) {
      conditions.push(`severity = '${severity}'`)
    }
    if (startDate) {
      conditions.push(`created_at >= '${startDate}'`)
    }
    if (endDate) {
      conditions.push(`created_at < '${endDate}'::date + interval '1 day'`)
    }
    if (search) {
      const sanitizedSearch = search.replace(/'/g, "''")
      conditions.push(`(
        action ILIKE '%${sanitizedSearch}%' OR
        resource_type ILIKE '%${sanitizedSearch}%' OR
        details::text ILIKE '%${sanitizedSearch}%'
      )`)
    }

    const whereClause = conditions.join(" AND ")

    // Get total count
    const countResult = await db.sql`
      SELECT COUNT(*) as total
      FROM audit_logs
      WHERE ${db.sql.raw(whereClause)}
    `
    const total = parseInt(countResult[0]?.total || "0", 10)

    // Get paginated results
    const logs = await db.sql`
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
      WHERE ${db.sql.raw(whereClause)}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

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

    return paginatedResponse(formattedLogs, {
      page,
      pageSize: limit,
      total,
    })
  } catch (error) {
    console.error("Audit log query error:", error)
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
    const { startDate, endDate, groupBy = "action" } = body

    // Get activity summary
    const activityByAction = await db.sql`
      SELECT
        action,
        COUNT(*) as count,
        COUNT(DISTINCT actor_id) as unique_actors
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        ${startDate ? db.sql`AND created_at >= ${startDate}` : db.sql``}
        ${endDate ? db.sql`AND created_at < ${endDate}::date + interval '1 day'` : db.sql``}
      GROUP BY action
      ORDER BY count DESC
      LIMIT 20
    `

    // Get activity by severity
    const activityBySeverity = await db.sql`
      SELECT
        severity,
        COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        ${startDate ? db.sql`AND created_at >= ${startDate}` : db.sql``}
        ${endDate ? db.sql`AND created_at < ${endDate}::date + interval '1 day'` : db.sql``}
      GROUP BY severity
    `

    // Get daily activity for the period
    const dailyActivity = await db.sql`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        ${startDate ? db.sql`AND created_at >= ${startDate}` : db.sql``}
        ${endDate ? db.sql`AND created_at < ${endDate}::date + interval '1 day'` : db.sql``}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `

    // Get top actors
    const topActors = await db.sql`
      SELECT
        actor_id,
        COUNT(*) as action_count
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND actor_id IS NOT NULL
        ${startDate ? db.sql`AND created_at >= ${startDate}` : db.sql``}
        ${endDate ? db.sql`AND created_at < ${endDate}::date + interval '1 day'` : db.sql``}
      GROUP BY actor_id
      ORDER BY action_count DESC
      LIMIT 10
    `

    // Get security events
    const securityEvents = await db.sql`
      SELECT
        action,
        COUNT(*) as count,
        MAX(created_at) as last_occurrence
      FROM audit_logs
      WHERE organization_id = ${auth.organization.id}
        AND action LIKE 'security.%'
        ${startDate ? db.sql`AND created_at >= ${startDate}` : db.sql``}
        ${endDate ? db.sql`AND created_at < ${endDate}::date + interval '1 day'` : db.sql``}
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
    console.error("Audit statistics error:", error)
    return Errors.internal().toResponse()
  }
}
