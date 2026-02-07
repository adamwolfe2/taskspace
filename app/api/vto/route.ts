import { NextResponse } from "next/server"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { vto } from "@/lib/db/vto"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { vtoUpsertSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logger"
import type { ApiResponse } from "@/lib/types"
import type { VTODocument } from "@/lib/db/vto"

// GET /api/vto?workspaceId=xxx
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

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

    const doc = await vto.get(workspaceId)

    return NextResponse.json<ApiResponse<VTODocument | null>>({
      success: true,
      data: doc,
    })
  } catch (error) {
    logger.error({ error }, "Get VTO error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get VTO document" },
      { status: 500 }
    )
  }
})

// PUT /api/vto - Upsert VTO document
export const PUT = withAuth(async (request, auth) => {
  try {
    const { workspaceId, ...data } = await validateBody(request, vtoUpsertSchema) as { workspaceId: string; [key: string]: unknown }

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

    const doc = await vto.upsert(workspaceId, data, auth.user.id)

    return NextResponse.json<ApiResponse<VTODocument>>({
      success: true,
      data: doc,
    })
  } catch (error) {
    logger.error({ error }, "Upsert VTO error")
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to save VTO document" },
      { status: 500 }
    )
  }
})
