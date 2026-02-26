/**
 * Client Portal — Task Requests
 *
 * POST /api/client/[slug]/[token]/tasks
 * Public, rate-limited 5/15min.
 * Creates a task pool item tagged with "[Client] {clientName}".
 */

import { NextRequest, NextResponse } from "next/server"
import { validatePortalToken } from "@/lib/auth/client-portal-auth"
import { enforceIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { clientPortalTaskSchema } from "@/lib/validation/schemas"
import { taskPool } from "@/lib/db/task-pool"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const headers = new Headers()
  headers.set("X-Robots-Tag", "noindex, nofollow")
  headers.set("Cache-Control", "private, no-store")

  try {
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "client-portal-tasks", maxRequests: 5 }
    )
    if (rateLimitResponse) return rateLimitResponse

    const { slug, token } = await params
    const auth = await validatePortalToken(slug, token)

    if ("error" in auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: auth.error },
        { status: auth.status, headers }
      )
    }

    const { client } = auth
    const { title, description } = await validateBody(request, clientPortalTaskSchema)

    const item = await taskPool.create({
      organizationId: client.organizationId,
      workspaceId: client.workspaceId,
      title,
      description,
      priority: "normal",
      createdById: client.id,
      createdByName: `[Client] ${client.name}`,
    })

    logger.info({ clientId: client.id, itemId: item.id }, "Client portal task request created")

    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    for (const [key, value] of Object.entries(rlHeaders)) {
      headers.set(key, value)
    }

    return NextResponse.json<ApiResponse<{ success: true }>>(
      { success: true, data: { success: true }, message: "Your request has been submitted to the team." },
      { status: 201, headers }
    )
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode, headers }
      )
    }
    logError(logger, "Client portal task creation error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to submit task request" },
      { status: 500, headers }
    )
  }
}
