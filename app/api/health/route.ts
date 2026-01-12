/**
 * Health Check Endpoint
 *
 * Provides comprehensive system health status for monitoring and load balancers.
 * Returns:
 * - 200: System healthy
 * - 503: System degraded or unhealthy
 */

import { sql } from "@/lib/db/sql"
import { NextRequest, NextResponse } from "next/server"

interface HealthCheck {
  status: "ok" | "warning" | "error"
  latencyMs?: number
  error?: string
  details?: Record<string, unknown>
}

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  checks: {
    server: HealthCheck
    database: HealthCheck
    tables: HealthCheck
    memory: HealthCheck
  }
  uptime: number
  env: {
    hasPostgresUrl: boolean
    nodeEnv: string
  }
}

// Track server start time for uptime calculation
const startTime = Date.now()

export async function GET(_request: NextRequest): Promise<NextResponse> {
  const checks: HealthStatus["checks"] = {
    server: { status: "ok" },
    database: { status: "ok" },
    tables: { status: "ok" },
    memory: { status: "ok" },
  }

  let overallStatus: HealthStatus["status"] = "healthy"

  // Database connection check with latency
  try {
    const dbStart = Date.now()
    const { rows } = await sql`SELECT 1 as test`
    const latency = Date.now() - dbStart

    if (rows[0]?.test === 1) {
      checks.database = {
        status: latency > 500 ? "warning" : "ok",
        latencyMs: latency,
      }
      if (latency > 500 && overallStatus === "healthy") {
        overallStatus = "degraded"
      }
    }
  } catch (error) {
    checks.database = {
      status: "error",
      error: error instanceof Error ? error.message : "Database connection failed",
    }
    overallStatus = "unhealthy"
  }

  // Table existence check
  if (checks.database.status !== "error") {
    try {
      const { rows: tableRows } = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name
      `
      const tables = tableRows.map((r) => r.table_name)
      const requiredTables = [
        "users",
        "organizations",
        "organization_members",
        "sessions",
        "assigned_tasks",
        "rocks",
        "eod_reports",
      ]
      const missingTables = requiredTables.filter((t) => !tables.includes(t))

      if (missingTables.length === 0) {
        checks.tables = {
          status: "ok",
          details: { tableCount: tables.length },
        }
      } else {
        checks.tables = {
          status: "error",
          error: `Missing tables: ${missingTables.join(", ")}`,
          details: { missing: missingTables },
        }
        overallStatus = "unhealthy"
      }
    } catch (error) {
      checks.tables = {
        status: "error",
        error: error instanceof Error ? error.message : "Failed to check tables",
      }
    }
  }

  // Memory check
  try {
    const memUsage = process.memoryUsage()
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
    const percentUsed = totalMB > 0 ? Math.round((usedMB / totalMB) * 100) : 0

    checks.memory = {
      status: percentUsed > 90 ? "warning" : "ok",
      details: {
        usedMB,
        totalMB,
        percentUsed,
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
    }

    if (percentUsed > 90 && overallStatus === "healthy") {
      overallStatus = "degraded"
    }
  } catch {
    checks.memory = { status: "ok", details: { available: false } }
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "dev",
    checks,
    uptime: Math.round((Date.now() - startTime) / 1000),
    env: {
      hasPostgresUrl: !!process.env.POSTGRES_URL,
      nodeEnv: process.env.NODE_ENV || "development",
    },
  }

  // Return appropriate status code
  const statusCode = overallStatus === "unhealthy" ? 503 : 200

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Health-Status": overallStatus,
    },
  })
}

// HEAD request for simple health checks (load balancers)
export async function HEAD(): Promise<NextResponse> {
  try {
    await sql`SELECT 1`
    return new NextResponse(null, { status: 200 })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
