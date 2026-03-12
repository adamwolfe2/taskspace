import { NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/sql"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { webVitalsSchema } from "@/lib/validation/schemas"

/**
 * Web Vitals Analytics Endpoint
 *
 * Collects Core Web Vitals metrics for performance monitoring.
 * Data can be analyzed to identify performance issues and track improvements.
 */

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const metric = await validateBody(request, webVitalsSchema).catch(() => null)

    if (!metric) {
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
    logger.debug({ error: error instanceof Error ? error.message : String(error) }, "Web Vitals: failed to store metric")

    // Return 200 even on error to prevent client-side retries
    return NextResponse.json<ApiResponse<{ received: boolean }>>({
      success: true,
      data: { received: false },
    })
  }
}
