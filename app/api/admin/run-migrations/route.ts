/**
 * EMERGENCY: Run database migrations
 *
 * This endpoint executes all pending migrations directly.
 * ONLY run this once!
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"
import { logger } from "@/lib/logger"
import { readFileSync, readdirSync } from "fs"
import { join } from "path"

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth || !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized - Admin only" },
        { status: 403 }
      )
    }

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

        // Execute the SQL using sql.query() method
        await sql.query(sqlContent)

        logger.info(`✓ Completed: ${file}`)
        results.push({ file, status: "success" })

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        logger.error(`✗ Failed: ${file}`, { error: errorMsg })
        results.push({ file, status: "failed", error: errorMsg })
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
    logger.error("Migration execution failed", { error: errorMessage })

    return NextResponse.json<ApiResponse<null>>(
      {
        success: false,
        error: `Migration failed: ${errorMessage}`
      },
      { status: 500 }
    )
  }
}
