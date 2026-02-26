/**
 * Client Portal — Validate Token & Return Org Info
 *
 * GET /api/client/[slug]/[token]
 * Public, rate-limited 30/15min.
 * Returns client name, org branding, and member filter config.
 */

import { NextRequest, NextResponse } from "next/server"
import { validatePortalToken } from "@/lib/auth/client-portal-auth"
import { enforceIpRateLimit, ipRateLimitHeaders } from "@/lib/auth/ip-rate-limit"
import { logger, logError } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

interface PortalInfoResponse {
  clientName: string
  orgName: string
  orgLogoUrl: string | null
  orgPrimaryColor: string | null
  memberFilter: string[] | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const headers = new Headers()
  headers.set("X-Robots-Tag", "noindex, nofollow")
  headers.set("Cache-Control", "private, no-store")

  try {
    const { result: rateLimitResult, response: rateLimitResponse } = enforceIpRateLimit(
      request,
      { endpoint: "client-portal-info", maxRequests: 30 }
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

    logger.info({ clientId: client.id, orgSlug: slug }, "Client portal accessed")

    const rlHeaders = ipRateLimitHeaders(rateLimitResult)
    for (const [key, value] of Object.entries(rlHeaders)) {
      headers.set(key, value)
    }

    return NextResponse.json<ApiResponse<PortalInfoResponse>>(
      {
        success: true,
        data: {
          clientName: client.name,
          orgName: client.orgName,
          orgLogoUrl: client.orgLogoUrl,
          orgPrimaryColor: client.orgPrimaryColor,
          memberFilter: client.portalMemberFilter,
        },
      },
      { headers }
    )
  } catch (error) {
    logError(logger, "Client portal info error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load portal" },
      { status: 500, headers }
    )
  }
}
