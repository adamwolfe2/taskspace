import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import type { ApiResponse, DailyEnergy } from "@/lib/types"

// GET /api/productivity/energy - Get energy data for user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || auth.user.id
    const date = searchParams.get("date")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // If specific date requested, return single entry
    if (date) {
      const energy = await db.dailyEnergy.findByUserAndDate(
        userId,
        auth.organization.id,
        date
      )

      return NextResponse.json<ApiResponse<DailyEnergy | null>>({
        success: true,
        data: energy,
      })
    }

    // If date range requested, return array
    if (startDate && endDate) {
      const energyData = await db.dailyEnergy.findByUserDateRange(
        userId,
        auth.organization.id,
        startDate,
        endDate
      )

      return NextResponse.json<ApiResponse<DailyEnergy[]>>({
        success: true,
        data: energyData,
      })
    }

    // Default: return last 7 days
    const defaultEndDate = new Date().toISOString().split("T")[0]
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 7)

    const energyData = await db.dailyEnergy.findByUserDateRange(
      userId,
      auth.organization.id,
      defaultStartDate.toISOString().split("T")[0],
      defaultEndDate
    )

    return NextResponse.json<ApiResponse<DailyEnergy[]>>({
      success: true,
      data: energyData,
    })
  } catch (error) {
    console.error("Get energy data error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get energy data" },
      { status: 500 }
    )
  }
}

// POST /api/productivity/energy - Create or update daily energy
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.date) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing required field: date" },
        { status: 400 }
      )
    }

    // Validate energy level if provided
    if (body.energyLevel) {
      const validLevels = ["low", "medium", "high", "peak"]
      if (!validLevels.includes(body.energyLevel)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: `Invalid energy level. Must be one of: ${validLevels.join(", ")}` },
          { status: 400 }
        )
      }
    }

    const energy: Omit<DailyEnergy, "id" | "createdAt" | "updatedAt"> = {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      date: body.date,
      energyLevel: body.energyLevel,
      mood: body.mood,
      factors: body.factors || [],
      notes: body.notes,
    }

    const result = await db.dailyEnergy.upsert(energy)

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Create/update energy error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to save energy data" },
      { status: 500 }
    )
  }
}
