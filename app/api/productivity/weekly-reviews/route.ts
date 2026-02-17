import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth } from "@/lib/api/middleware"
import type { ApiResponse, WeeklyReview } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { z } from "zod"
import { validateBody, ValidationError } from "@/lib/validation/middleware"

const createWeeklyReviewSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accomplishments: z.array(z.object({ text: z.string(), category: z.string().optional() })).default([]),
  wentWell: z.string().optional(),
  couldImprove: z.string().optional(),
  nextWeekGoals: z.array(z.object({ text: z.string(), priority: z.string().optional() })).default([]),
  notes: z.string().optional(),
  mood: z.enum(["positive", "neutral", "negative"]).optional(),
  energyLevel: z.number().min(1).max(5).optional(),
  productivityRating: z.number().min(1).max(5).optional(),
})

// GET /api/productivity/weekly-reviews - List user's weekly reviews
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get("weekStart")

    // If specific week requested, return single review
    if (weekStart) {
      const review = await db.weeklyReviews.findByUserAndWeek(
        auth.user.id,
        auth.organization.id,
        weekStart
      )
      return NextResponse.json<ApiResponse<WeeklyReview | null>>({
        success: true,
        data: review,
      })
    }

    // Default: return recent reviews
    const reviews = await db.weeklyReviews.findByUser(auth.user.id, auth.organization.id)
    return NextResponse.json<ApiResponse<WeeklyReview[]>>({
      success: true,
      data: reviews,
    })
  } catch (error) {
    logError(logger, "Get weekly reviews error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get weekly reviews" },
      { status: 500 }
    )
  }
})

// POST /api/productivity/weekly-reviews - Create or update a weekly review
export const POST = withAuth(async (request, auth) => {
  try {
    const body = await validateBody(request, createWeeklyReviewSchema)

    const result = await db.weeklyReviews.upsert({
      organizationId: auth.organization.id,
      userId: auth.user.id,
      weekStart: body.weekStart,
      weekEnd: body.weekEnd,
      accomplishments: body.accomplishments,
      wentWell: body.wentWell,
      couldImprove: body.couldImprove,
      nextWeekGoals: body.nextWeekGoals,
      notes: body.notes,
      mood: body.mood,
      energyLevel: body.energyLevel,
      productivityRating: body.productivityRating,
    })

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
    logError(logger, "Save weekly review error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to save weekly review" },
      { status: 500 }
    )
  }
})
