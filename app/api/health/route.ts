/**
 * Health Check Endpoint
 *
 * Provides system health status for monitoring and load balancers.
 * Returns:
 * - 200: System healthy or degraded (database up, optional services missing)
 * - 503: System unhealthy (database down)
 */

import { sql } from "@/lib/db/sql"
import { NextRequest, NextResponse } from "next/server"

interface HealthServices {
  database: boolean
  ai: boolean
  stripe: boolean
  email: boolean
}

interface PublicHealthStatus {
  status: "healthy" | "degraded" | "unhealthy"
  timestamp: string
  services: HealthServices
  version: string
}

export async function GET(_request: NextRequest): Promise<NextResponse> {
  let databaseConnected = false

  // Database connection check (minimal, no latency exposed)
  try {
    const { rows } = await sql`SELECT 1 as test`
    databaseConnected = rows[0]?.test === 1
  } catch {
    databaseConnected = false
  }

  // Service configuration checks (verify env vars exist, no API calls)
  const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY)
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY)
  const emailConfigured = Boolean(process.env.RESEND_API_KEY)

  const services: HealthServices = {
    database: databaseConnected,
    ai: aiConfigured,
    stripe: stripeConfigured,
    email: emailConfigured,
  }

  // Status logic: unhealthy if DB down, degraded if DB up but other services missing
  let status: PublicHealthStatus["status"]
  if (!databaseConnected) {
    status = "unhealthy"
  } else if (!aiConfigured || !stripeConfigured || !emailConfigured) {
    status = "degraded"
  } else {
    status = "healthy"
  }

  const healthStatus: PublicHealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    services,
    version: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
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
