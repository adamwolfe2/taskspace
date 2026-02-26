/**
 * Client Portal Settings API
 *
 * PATCH /api/clients/[id]
 * Admin-only. Updates portal settings: portalEnabled, portalMemberFilter, regenerateToken.
 */

import { NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { updateClientPortalSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse, Client } from "@/lib/types"

export const PATCH = withAdmin(async (request, auth) => {
  try {
    const url = new URL(request.url)
    const id = url.pathname.split("/").at(-1) ?? ""

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Client ID is required" },
        { status: 400 }
      )
    }

    // Verify client belongs to this org
    const existing = await db.clients.findById(auth.organization.id, id)
    if (!existing) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const data = await validateBody(request, updateClientPortalSchema)

    const updated = await db.clients.updatePortalSettings(auth.organization.id, id, {
      portalEnabled: data.portalEnabled,
      portalMemberFilter: data.portalMemberFilter,
      regenerateToken: data.regenerateToken,
    })

    if (!updated) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Failed to update client portal settings" },
        { status: 500 }
      )
    }

    logger.info({ clientId: id, orgId: auth.organization.id }, "Client portal settings updated")

    return NextResponse.json<ApiResponse<Client>>({
      success: true,
      data: updated,
      message: "Portal settings updated",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Update client portal settings error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update portal settings" },
      { status: 500 }
    )
  }
})
