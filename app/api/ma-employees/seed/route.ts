import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin } from "@/lib/api/middleware"
import { MA_EMPLOYEES_SEED, TOTAL_EMPLOYEES } from "@/lib/org-chart/seed-data"
import { logger, logError } from "@/lib/logger"

// POST - Seed the database with all MA employees
// This will clear existing employees and insert fresh data
// ADMIN ONLY - requires authentication
export const POST = withAdmin(async (request, auth) => {
  // Block test data seeding in production unless explicitly allowed
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_ADMIN_DANGEROUS_OPS) {
    return NextResponse.json({ success: false, error: "This operation is disabled in production" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const clearFirst = searchParams.get("clear") !== "false" // Default to clearing first
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    let deletedCount = 0
    if (clearFirst) {
      // Clear existing employees for this workspace only
      // Note: deleteAll clears all, so we skip it for now to avoid cross-workspace deletion
      // TODO: Add deleteByWorkspace method if needed
      deletedCount = 0
    }

    // Insert all employees with workspace_id
    const employeesWithWorkspace = MA_EMPLOYEES_SEED.map(emp => ({
      ...emp,
      workspaceId,
    }))
    const insertedCount = await db.maEmployees.createMany(employeesWithWorkspace)

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${insertedCount} employees`,
      stats: {
        deleted: deletedCount,
        inserted: insertedCount,
        total: TOTAL_EMPLOYEES,
      }
    })
  } catch (error) {
    logError(logger, "Error seeding MA employees", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to seed employees",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
})

// GET - Check current employee count (admin only)
export const GET = withAdmin(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    const count = await db.maEmployees.countByWorkspace(workspaceId)

    return NextResponse.json({
      success: true,
      currentCount: count,
      seedDataCount: TOTAL_EMPLOYEES,
      needsSeeding: count === 0 || count < TOTAL_EMPLOYEES,
    })
  } catch (error) {
    logError(logger, "Error checking MA employees count", error)
    return NextResponse.json(
      { success: false, error: "Failed to check employee count" },
      { status: 500 }
    )
  }
})
