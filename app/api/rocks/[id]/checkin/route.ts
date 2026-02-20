/**
 * Rock Check-in API
 *
 * POST /api/rocks/[id]/checkin - Create weekly check-in
 */

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { getRockById, createRockCheckin, getWeekStart } from "@/lib/db/rocks"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createRockCheckinSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"

export const POST = withAuth(async (request, auth, context?) => {
  try {
    if (!context?.params) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Missing route parameters" },
        { status: 400 }
      )
    }
    const { id } = await context.params
    const rock = await getRockById(id)

    if (!rock) {
      return NextResponse.json(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Verify organization access
    if (rock.organizationId !== auth.organization.id) {
      return NextResponse.json(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Check workspace access if workspace-scoped (admins bypass this check)
    if (!isAdmin(auth) && rock.workspaceId) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, rock.workspaceId)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: "Access denied to this workspace" },
          { status: 403 }
        )
      }
    }

    const { confidence, notes, weekStart } = await validateBody(request, createRockCheckinSchema)

    const checkin = await createRockCheckin({
      rockId: id,
      userId: auth.user.id,
      confidence,
      notes: notes?.trim() || undefined,
      weekStart: weekStart || getWeekStart(),
    })

    logger.info({
      userId: auth.user.id,
      rockId: id,
      confidence,
      weekStart: checkin.weekStart,
    }, "Rock check-in created")

    return NextResponse.json({
      success: true,
      data: checkin,
      message: "Check-in recorded successfully",
    })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }
    logger.error({ error }, "Error creating rock check-in")
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create check-in",
      },
      { status: 500 }
    )
  }
})
