/**
 * Health Check Endpoint
 *
 * Provides minimal system health status for monitoring and load balancers.
 * Returns:
 * - 200: System healthy
 * - 503: System unhealthy
 */

import { sql } from "@/lib/db/sql"
import { NextRequest, NextResponse } from "next/server"

interface PublicHealthStatus {
  status: "healthy" | "unhealthy"
  timestamp: string
  database: boolean
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  let status: "healthy" | "unhealthy" = "healthy"
  let databaseConnected = false

  // Database connection check (minimal, no latency exposed)
  try {
    const { rows } = await sql`SELECT 1 as test`
    databaseConnected = rows[0]?.test === 1

    if (!databaseConnected) {
      status = "unhealthy"
    }
  } catch {
    status = "unhealthy"
    databaseConnected = false
  }

  const healthStatus: PublicHealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    database: databaseConnected,
  }

  // Return appropriate status code
  const statusCode = status === "unhealthy" ? 503 : 200

  return NextResponse.json(healthStatus, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
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
