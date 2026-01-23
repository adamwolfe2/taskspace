import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { MA_EMPLOYEES_SEED, TOTAL_EMPLOYEES } from "@/lib/org-chart/seed-data"
import { logger, logError } from "@/lib/logger"

// POST - Seed the database with all MA employees
// This will clear existing employees and insert fresh data
// ADMIN ONLY - requires authentication
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const clearFirst = searchParams.get("clear") !== "false" // Default to clearing first

    let deletedCount = 0
    if (clearFirst) {
      // Clear existing employees
      deletedCount = await db.maEmployees.deleteAll()
    }

    // Insert all employees
    const insertedCount = await db.maEmployees.createMany(MA_EMPLOYEES_SEED)

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
}

// GET - Check current employee count (admin only)
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json(
        { success: false, error: "Admin access required" },
        { status: 403 }
      )
    }

    const count = await db.maEmployees.count()

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
}
