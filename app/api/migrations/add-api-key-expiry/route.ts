import { NextRequest, NextResponse } from "next/server"
import { withSuperAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

/**
 * POST /api/migrations/add-api-key-expiry
 *
 * Adds expires_at column to api_keys table for API key expiration support.
 * Safe to run multiple times (uses IF NOT EXISTS).
 *
 * Protected by withSuperAdmin.
 */
export const POST = withSuperAdmin(async (request: NextRequest, auth) => {
  try {
    // Add expires_at column (nullable — null means no expiry)
    await sql`
      ALTER TABLE api_keys
      ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ
    `

    logger.info("Migration: added expires_at column to api_keys table")

    return NextResponse.json<ApiResponse<{ migrated: boolean }>>({
      success: true,
      data: { migrated: true },
      message: "Added expires_at column to api_keys table",
    })
  } catch (error) {
    logError(logger, "Migration add-api-key-expiry failed", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Migration failed" },
      { status: 500 }
    )
  }
})
