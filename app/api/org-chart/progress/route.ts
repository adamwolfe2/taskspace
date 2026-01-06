import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"

// GET - Fetch all rock progress or for a specific employee
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const employeeName = searchParams.get("employeeName")

    if (employeeName) {
      const progress = await db.orgChartRockProgress.findByEmployee(employeeName)
      return NextResponse.json({
        success: true,
        progress,
      })
    }

    const progress = await db.orgChartRockProgress.findAll()
    return NextResponse.json({
      success: true,
      progress,
    })
  } catch (error) {
    console.error("Error fetching rock progress:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch rock progress" },
      { status: 500 }
    )
  }
}

// POST - Update rock progress (toggle bullet completion)
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { employeeName, rockIndex, bulletIndex, completed, updatedBy } = body

    if (!employeeName || rockIndex === undefined || bulletIndex === undefined || completed === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    await db.orgChartRockProgress.upsert(
      employeeName,
      rockIndex,
      bulletIndex,
      completed,
      updatedBy || auth.member.name
    )

    return NextResponse.json({
      success: true,
      message: "Progress updated successfully",
    })
  } catch (error) {
    console.error("Error updating rock progress:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update rock progress" },
      { status: 500 }
    )
  }
}

// DELETE - Delete progress for an employee (when rocks are changed)
export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const employeeName = searchParams.get("employeeName")

    if (!employeeName) {
      return NextResponse.json(
        { success: false, error: "Employee name is required" },
        { status: 400 }
      )
    }

    await db.orgChartRockProgress.deleteByEmployee(employeeName)

    return NextResponse.json({
      success: true,
      message: "Progress deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting rock progress:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete rock progress" },
      { status: 500 }
    )
  }
}
