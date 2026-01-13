/**
 * Database Migration Status Endpoint
 *
 * This endpoint provides migration status information only.
 * Actual migrations are run via CLI: npm run migrate
 *
 * IMPORTANT: Migrations are NOT exposed via HTTP for security.
 * Use the CLI or deployment hooks for actual migrations.
 */

import { NextResponse } from "next/server"
import { getDatabaseHealth, checkMigrationStatus } from "@/lib/db/migrate"
import { getAuthenticatedUser } from "@/lib/auth/middleware"
import type { ApiResponse } from "@/lib/types"

interface MigrationStatusResponse {
  initialized: boolean
  healthy: boolean
  lastMigration: string | null
  pendingMigrations: number
  message: string
}

/**
 * GET /api/db/migrate
 *
 * Returns database migration status (admin only).
 * Does NOT run migrations - use CLI instead.
 */
export async function GET(request: Request) {
  try {
    // Require authentication
    const auth = await getAuthenticatedUser(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Require admin or owner role
    if (auth.member.role !== "admin" && auth.member.role !== "owner") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    // Get database health and migration status
    const health = await getDatabaseHealth()
    const status = await checkMigrationStatus()

    const response: MigrationStatusResponse = {
      initialized: health.initialized,
      healthy: health.healthy,
      lastMigration: status.lastApplied,
      pendingMigrations: status.pending.length,
      message: health.healthy
        ? "Database is healthy. Run migrations via CLI: npm run migrate"
        : health.error || "Database health check failed",
    }

    return NextResponse.json<ApiResponse<MigrationStatusResponse>>({
      success: true,
      data: response,
      message:
        "Migration status retrieved. Migrations are run via CLI only for security.",
    })
  } catch (error) {
    console.error("Migration status check error:", error)
    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Failed to check migration status",
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/db/migrate
 *
 * Migrations via HTTP are disabled for security.
 * Returns instructions for running migrations via CLI.
 */
export async function POST() {
  return NextResponse.json<ApiResponse<null>>(
    {
      success: false,
      error:
        "HTTP-based migrations are disabled for security. Use CLI: npm run migrate",
    },
    { status: 405 }
  )
}
