import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { MA_EMPLOYEES_SEED, TOTAL_EMPLOYEES } from "@/lib/org-chart/seed-data"

// POST - Seed the database with all MA employees
// This will clear existing employees and insert fresh data
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clearFirst = searchParams.get("clear") !== "false" // Default to clearing first

    // Check for authorization (optional - for admin protection)
    // You could add auth check here if needed

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
    console.error("Error seeding MA employees:", error)
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

// GET - Check current employee count
export async function GET() {
  try {
    const count = await db.maEmployees.count()

    return NextResponse.json({
      success: true,
      currentCount: count,
      seedDataCount: TOTAL_EMPLOYEES,
      needsSeeding: count === 0 || count < TOTAL_EMPLOYEES,
    })
  } catch (error) {
    console.error("Error checking MA employees count:", error)
    return NextResponse.json(
      { success: false, error: "Failed to check employee count" },
      { status: 500 }
    )
  }
}
