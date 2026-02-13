import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import type { ApiResponse } from "@/lib/types"

/**
 * Web Vitals Analytics Endpoint
 *
 * Collects Core Web Vitals metrics for performance monitoring.
 * Data can be analyzed to identify performance issues and track improvements.
 */

interface WebVitalMetric {
  name: string
  value: number
  rating: "good" | "needs-improvement" | "poor"
  id: string
  navigationType: string
  url: string
  userAgent: string
  timestamp: number
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const metric: WebVitalMetric = await request.json()

    // Validate required fields
    if (!metric.name || typeof metric.value !== "number" || !metric.rating) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Invalid metric data" },
        { status: 400 }
      )
    }

    // Store in database for analysis
    await sql`
      INSERT INTO web_vitals_metrics (
        metric_name,
        metric_value,
        rating,
        metric_id,
        navigation_type,
        url,
        user_agent,
        timestamp,
        created_at
      ) VALUES (
        ${metric.name},
        ${metric.value},
        ${metric.rating},
        ${metric.id},
        ${metric.navigationType || "navigate"},
        ${metric.url},
        ${metric.userAgent},
        ${new Date(metric.timestamp).toISOString()},
        NOW()
      )
      ON CONFLICT (metric_id) DO NOTHING
    `

    return NextResponse.json<ApiResponse<{ received: boolean }>>({
      success: true,
      data: { received: true },
    })
  } catch (error) {
    // Silently log error - analytics failures should not affect user experience
    console.error("[Web Vitals] Failed to store metric:", error)

    // Return 200 even on error to prevent client-side retries
    return NextResponse.json<ApiResponse<{ received: boolean }>>({
      success: true,
      data: { received: false },
    })
  }
}
