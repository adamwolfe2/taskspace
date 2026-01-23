import { NextResponse } from "next/server"
import { updateEmployeeRocks } from "@/lib/org-chart/airtable"
import { logger, logError } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    const { rocks } = body

    if (typeof rocks !== "string") {
      return NextResponse.json(
        { success: false, error: "Rocks must be a string" },
        { status: 400 }
      )
    }

    // Check if Airtable is configured
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      return NextResponse.json(
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
    return NextResponse.json(
      { success: false, error: "Failed to update rocks" },
      { status: 500 }
    )
  }
}
