/**
 * EMERGENCY: Run database migrations
 *
 * This endpoint executes all pending migrations directly.
 * ONLY run this once!
 */

import { NextRequest, NextResponse } from "next/server"
import { withDangerousAdmin } from "@/lib/api/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

export const POST = withDangerousAdmin(async (_request: NextRequest, _auth) => {

  try {
    logger.info("🚨 RUNNING DATABASE MIGRATIONS")

    // Get all migration files
    const migrationsDir = join(process.cwd(), "migrations")
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort()

    logger.info(`Found ${files.length} migration files`)

    const results = []

    for (const file of files) {
      try {
        logger.info(`Running migration: ${file}`)

        const filePath = join(migrationsDir, file)
        const sqlContent = readFileSync(filePath, "utf-8")

        // Execute the SQL (raw query for migration)
        // @ts-expect-error - Dynamic SQL from migration file (admin only)
        await sql([sqlContent])

        logger.info(`✓ Completed: ${file}`)
        results.push({ file, status: "success" })

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        logger.error({ error: errorMsg }, `✗ Failed: ${file}`)
        results.push({ file, status: "failed", error: "Unknown error" })
      }
    }

    const successCount = results.filter(r => r.status === "success").length
    const failCount = results.filter(r => r.status === "failed").length

    return NextResponse.json<ApiResponse<{
      migrations: typeof results
      total: number
      succeeded: number
      failed: number
    }>>({
      success: failCount === 0,
      data: {
        migrations: results,
        total: results.length,
        succeeded: successCount,
        failed: failCount
      },
      message: `Migrations complete: ${successCount} succeeded, ${failCount} failed`
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    logger.error({ error: errorMessage }, "Migration execution failed")

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: "Migration failed"
      },
      { status: 500 }
    )
  }
})
