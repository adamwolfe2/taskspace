import { NextResponse } from "next/server"
import { updateEmployeeRocks } from "@/lib/org-chart/airtable"
import { withAuth } from "@/lib/api/middleware"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { orgChartEmployeeRocksSchema } from "@/lib/validation/schemas"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

export const PATCH = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const { rocks } = await validateBody(request, orgChartEmployeeRocksSchema)

    // Check if Airtable is configured
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Airtable not configured" },
        { status: 503 }
      )
    }

    await updateEmployeeRocks(id, rocks)

    return NextResponse.json({
      success: true,
      message: "Rocks updated successfully",
    })
  } catch (error) {
    logError(logger, "Error updating rocks", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update rocks" },
      { status: 500 }
    )
  }
})
