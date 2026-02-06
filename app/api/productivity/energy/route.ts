import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createDailyEnergySchema } from "@/lib/validation/schemas"
import type { ApiResponse, DailyEnergy } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

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
    // workspaceId is optional - workspace feature temporarily disabled
    const workspaceId = searchParams.get("workspaceId")
    const requestedUserId = searchParams.get("userId")
    const date = searchParams.get("date")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Users can only view their own data unless they're admin/owner
    const userIsAdmin = isAdmin(auth)
    const userId = requestedUserId && userIsAdmin ? requestedUserId : auth.user.id

    // If specific date requested, return single entry
    if (date) {
      const energy = await db.dailyEnergy.findByUserAndDate(
        userId,
        auth.organization.id,
        date
      )

      // Filter by workspace if provided (workspace feature temporarily disabled)
      if (workspaceId && energy && energy.workspaceId !== workspaceId) {
        return NextResponse.json<ApiResponse<DailyEnergy | null>>({
          success: true,
          data: null,
        })
      }

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

      // Filter by workspace if provided (workspace feature temporarily disabled)
      const workspaceEnergyData = workspaceId
        ? energyData.filter(e => e.workspaceId === workspaceId)
        : energyData

      return NextResponse.json<ApiResponse<DailyEnergy[]>>({
        success: true,
        data: workspaceEnergyData,
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

    // Filter by workspace if provided (workspace feature temporarily disabled)
    const workspaceEnergyData = workspaceId
      ? energyData.filter(e => e.workspaceId === workspaceId)
      : energyData

    return NextResponse.json<ApiResponse<DailyEnergy[]>>({
      success: true,
      data: workspaceEnergyData,
    })
  } catch (error) {
    logError(logger, "Get energy data error", error)
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

    const body = await validateBody(request, createDailyEnergySchema)

    // Validate workspace access
    const hasAccess = await userHasWorkspaceAccess(auth.user.id, body.workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You don't have access to this workspace" },
        { status: 403 }
      )
    }

    const energy: Omit<DailyEnergy, "id" | "createdAt" | "updatedAt"> = {
      organizationId: auth.organization.id,
      userId: auth.user.id,
      workspaceId: body.workspaceId,
      date: body.date,
      energyLevel: body.energyLevel,
      mood: body.mood,
      factors: body.factors,
      notes: body.notes,
    }

    const result = await db.dailyEnergy.upsert(energy)

    return NextResponse.json<ApiResponse<{ id: string }>>({
      success: true,
      data: result,
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logError(logger, "Create/update energy error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to save energy data" },
      { status: 500 }
    )
  }
}
