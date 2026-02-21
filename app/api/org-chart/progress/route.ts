import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import { validateBody } from "@/lib/validation/middleware"
import { orgChartProgressSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

// GET - Fetch all rock progress or for a specific employee
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeName = searchParams.get("employeeName")

    if (employeeName) {
      const progress = await db.orgChartRockProgress.findByEmployee(auth.organization.id, employeeName)
      return NextResponse.json({
        success: true,
        progress,
      })
    }

    const progress = await db.orgChartRockProgress.findAll(auth.organization.id)
    return NextResponse.json({
      success: true,
      progress,
    })
  } catch (error) {
    logError(logger, "Error fetching rock progress", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch rock progress" },
      { status: 500 }
    )
  }
})

// POST - Update rock progress (toggle bullet completion)
export const POST = withAuth(async (request, auth) => {
  try {
    const { employeeName, rockIndex, bulletIndex, completed, updatedBy } = await validateBody(request, orgChartProgressSchema)

    await db.orgChartRockProgress.upsert(
      auth.organization.id,
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
    logError(logger, "Error updating rock progress", error)
    return NextResponse.json(
      { success: false, error: "Failed to update rock progress" },
      { status: 500 }
    )
  }
})

// DELETE - Delete progress for an employee (when rocks are changed)
export const DELETE = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const employeeName = searchParams.get("employeeName")

    if (!employeeName) {
      return NextResponse.json(
        { success: false, error: "Employee name is required" },
        { status: 400 }
      )
    }

    await db.orgChartRockProgress.deleteByEmployee(auth.organization.id, employeeName)

    return NextResponse.json({
      success: true,
      message: "Progress deleted successfully",
    })
  } catch (error) {
    logError(logger, "Error deleting rock progress", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete rock progress" },
      { status: 500 }
    )
  }
})
