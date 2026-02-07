import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { peopleAssessments } from "@/lib/db/people-assessments"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { PeopleAssessment, PeopleAnalyzerSummary } from "@/lib/db/people-assessments"

// GET /api/people-assessments?workspaceId=xxx&view=summary
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const view = searchParams.get("view")

    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    if (view === "summary") {
      const summary = await peopleAssessments.getSummary(workspaceId)
      return NextResponse.json<ApiResponse<PeopleAnalyzerSummary[]>>({
        success: true,
        data: summary,
      })
    }

    const assessments = await peopleAssessments.list(workspaceId)
    return NextResponse.json<ApiResponse<PeopleAssessment[]>>({
      success: true,
      data: assessments,
    })
  } catch (error) {
    logger.error({ error }, "Get people assessments error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get assessments" },
      { status: 500 }
    )
  }
})

// POST /api/people-assessments
export const POST = withAuth(async (request, auth) => {
  try {
    const body = await request.json()
    const { workspaceId, employeeId, employeeName, getsIt, wantsIt, hasCapacity, coreValuesRating, rightPersonRightSeat, notes } = body

    if (!workspaceId || !employeeId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace ID and employee ID are required" },
        { status: 400 }
      )
    }

    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
    if (!hasAccess) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      )
    }

    const assessment = await peopleAssessments.create({
      workspaceId,
      employeeId,
      employeeName,
      assessorId: auth.user.id,
      getsIt: getsIt || false,
      wantsIt: wantsIt || false,
      hasCapacity: hasCapacity || false,
      coreValuesRating,
      rightPersonRightSeat,
      notes,
    })

    return NextResponse.json<ApiResponse<PeopleAssessment>>({
      success: true,
      data: assessment,
    })
  } catch (error) {
    logger.error({ error }, "Create people assessment error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create assessment" },
      { status: 500 }
    )
  }
})
