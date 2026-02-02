/**
 * Rock Check-in API
 *
 * POST /api/rocks/[id]/checkin - Create weekly check-in
 */

import { NextRequest, NextResponse } from "next/server"
import { getAuthContext } from "@/lib/auth/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { getRockById, createRockCheckin, getWeekStart } from "@/lib/db/rocks"
import { logger } from "@/lib/logger"

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    const { id } = await params
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

    // Check workspace access if workspace-scoped
    if (rock.workspaceId) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, rock.workspaceId)
      if (!hasAccess) {
        return NextResponse.json(
          { success: false, error: "Access denied to this workspace" },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { confidence, notes, weekStart } = body

    // Validate confidence
    if (!confidence || !["on_track", "at_risk", "off_track"].includes(confidence)) {
      return NextResponse.json(
        { success: false, error: "Valid confidence level is required (on_track, at_risk, off_track)" },
        { status: 400 }
      )
    }

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
    logger.error({ error }, "Error creating rock check-in")
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create check-in",
      },
      { status: 500 }
    )
  }
}
