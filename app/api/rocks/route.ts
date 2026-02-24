import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAuth, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import { validateBody, ValidationError } from "@/lib/validation/middleware"
import { createRockSchema, updateRockSchema } from "@/lib/validation/schemas"
import type { Rock, ApiResponse } from "@/lib/types"
import { parsePaginationParams, buildPaginatedResponse } from "@/lib/utils/pagination"
import type { PaginatedResponse } from "@/lib/utils/pagination"
import { logger, logError } from "@/lib/logger"
import { dispatchWebhook } from "@/lib/webhooks/dispatcher"
import { sendNotification } from "@/lib/db/notifications"
import { audit } from "@/lib/audit"
import { isTrialExpired } from "@/lib/billing/feature-gates"

// GET /api/rocks - Get rocks
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const quarter = searchParams.get("quarter")
    const workspaceId = searchParams.get("workspaceId")

    // SECURITY: workspaceId is required to prevent data leakage across workspaces
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // SECURITY: Validate workspace access (unless org admin)
    // Return 404 instead of 403 to avoid information leakage about workspace existence
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace not found" },
          { status: 404 }
        )
      }
    }

    // Check if pagination params are provided
    const cursor = searchParams.get("cursor")
    const limitParam = searchParams.get("limit")
    const usePagination = cursor !== null || limitParam !== null

    if (usePagination) {
      // Paginated path
      const pagination = parsePaginationParams(searchParams)
      const filterUserId = userId
        ? (userId !== auth.user.id && !isAdmin(auth) ? "__denied__" : userId)
        : (isAdmin(auth) ? undefined : auth.user.id)

      if (filterUserId === "__denied__") {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You can only view your own rocks" },
          { status: 403 }
        )
      }

      const { rocks, totalCount } = await db.rocks.findPaginated(
        auth.organization.id,
        workspaceId,
        pagination,
        { userId: filterUserId, quarter: quarter || undefined }
      )

      const response = buildPaginatedResponse(
        rocks,
        pagination.limit,
        totalCount,
        (r) => r.createdAt,
        (r) => r.id
      )

      return NextResponse.json<ApiResponse<PaginatedResponse<Rock>>>({
        success: true,
        data: response,
      })
    }

    // Legacy non-paginated path (backward compatible)
    let rocks: Rock[]

    if (userId) {
      // Get specific user's rocks (admin only for other users)
      if (userId !== auth.user.id && !isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You can only view your own rocks" },
          { status: 403 }
        )
      }
      rocks = await db.rocks.findByUserId(userId, auth.organization.id, workspaceId)
    } else if (isAdmin(auth)) {
      // Admins can see all rocks in the workspace
      rocks = await db.rocks.findByOrganizationId(auth.organization.id, workspaceId)
    } else {
      // Regular members see only their rocks in this workspace
      rocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id, workspaceId)
    }

    // Filter by quarter if specified
    if (quarter) {
      rocks = rocks.filter((rock) => rock.quarter === quarter)
    }

    return NextResponse.json<ApiResponse<Rock[]>>({
      success: true,
      data: rocks,
    })
  } catch (error) {
    logError(logger, "Get rocks error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get rocks" },
      { status: 500 }
    )
  }
})

// POST /api/rocks - Create a new rock
export const POST = withAuth(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { title, description, dueDate, bucket, outcome, doneWhen, userId, quarter, workspaceId, projectId } =
      await validateBody(request, createRockSchema)

    // SECURITY: Verify workspace belongs to user's organization
    const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
    if (!isValidWorkspace) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      )
    }

    // SECURITY: Validate workspace access (unless org admin)
    // Return 404 instead of 403 to avoid information leakage about workspace existence
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace not found" },
          { status: 404 }
        )
      }
    }

    // Block rock creation if trial has expired
    if (isTrialExpired(auth.organization.subscription, auth.organization.isInternal)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Your trial has expired. Please upgrade your plan to continue creating rocks." },
        { status: 402 }
      )
    }

    // Determine which user the rock belongs to
    let targetUserId: string | undefined = auth.user.id
    let ownerEmail: string | undefined = undefined

    if (userId && userId !== auth.user.id) {
      if (!isAdmin(auth)) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Only admins can create rocks for other users" },
          { status: 403 }
        )
      }

      // First check if this is a user ID or might be a member email
      let targetMember = await db.members.findByOrgAndUser(auth.organization.id, userId)

      // If not found by userId, try finding by email (in case frontend passed email)
      if (!targetMember) {
        const members = await db.members.findByOrganizationId(auth.organization.id)
        targetMember = members.find(m => m.email.toLowerCase() === userId.toLowerCase()) || null
      }

      if (!targetMember) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "User is not a member of this organization" },
          { status: 404 }
        )
      }

      // Check if member has a user account
      if (targetMember.userId) {
        // Member has accepted invitation - use their userId
        targetUserId = targetMember.userId
        ownerEmail = undefined
      } else {
        // Draft member (invited but not accepted) - use their email
        ownerEmail = targetMember.email
        targetUserId = undefined
      }
    }

    // Get project name if linked to a project
    let projectName: string | null = null
    if (projectId) {
      const project = await db.projects.findById(auth.organization.id, projectId)
      if (project) {
        projectName = project.name
      }
    }

    const now = new Date().toISOString()
    const rock: Rock = {
      id: generateId(),
      organizationId: auth.organization.id,
      workspaceId: workspaceId, // Required - validated above
      userId: targetUserId,
      ownerEmail: ownerEmail,
      title: title.trim(),
      description: description.trim(),
      progress: 0,
      dueDate,
      status: "on-track",
      createdAt: now,
      updatedAt: now,
      bucket,
      outcome,
      doneWhen: doneWhen || [],
      quarter,
      projectId: projectId || null,
      projectName,
    }

    await db.rocks.create(rock)

    audit(auth, request, "rock.created", {
      resourceType: "rock",
      resourceId: rock.id,
      newValues: { title: rock.title, quarter: rock.quarter, userId: rock.userId },
    })

    // Fire webhook (best-effort, non-blocking)
    dispatchWebhook(auth.organization.id, "rock.created", {
      rockId: rock.id,
      title: rock.title,
      userId: rock.userId,
      quarter: rock.quarter,
      workspaceId: rock.workspaceId,
    }).catch(err => logError(logger, "Rock creation webhook failed", err))

    return NextResponse.json<ApiResponse<Rock>>({
      success: true,
      data: rock,
      message: "Rock created successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Create rock error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to create rock" },
      { status: 500 }
    )
  }
})

// PATCH /api/rocks - Update a rock
export const PATCH = withAuth(async (request: NextRequest, auth) => {
  try {
    // Validate request body
    const { id, expectedUpdatedAt, ...updates } = await validateBody(request, updateRockSchema)

    const rock = await db.rocks.findById(id)
    if (!rock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Verify rock belongs to this organization
    if (rock.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Check permissions - users can update their own rocks, admins can update any
    if (rock.userId !== auth.user.id && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only update your own rocks" },
        { status: 403 }
      )
    }

    // Update progress status based on progress value
    if (updates.progress !== undefined) {
      if (updates.progress >= 100) {
        updates.status = "completed"
      } else if (rock.status === "completed" && updates.progress < 100) {
        updates.status = "on-track"
      }
    }

    // Look up project name if setting a project
    if (updates.projectId !== undefined) {
      if (updates.projectId) {
        const project = await db.projects.findById(auth.organization.id, updates.projectId)
        if (project) {
          (updates as Record<string, unknown>).projectName = project.name
        }
      } else {
        (updates as Record<string, unknown>).projectName = null
      }
    }

    const updatedRock = await db.rocks.update(id, updates, expectedUpdatedAt)

    if (!updatedRock && expectedUpdatedAt) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "This rock was modified by another user. Please refresh and try again." },
        { status: 409 }
      )
    }

    // Send notification when rock is newly completed (best-effort, non-blocking)
    const justCompleted = updatedRock?.status === "completed" && rock.status !== "completed"
    if (justCompleted && updatedRock) {
      // If admin completed another user's rock, notify that user
      if (updatedRock.userId && updatedRock.userId !== auth.user.id) {
        sendNotification({
          organizationId: auth.organization.id,
          workspaceId: rock.workspaceId || undefined,
          userId: updatedRock.userId,
          type: "rock_updated",
          title: "Rock marked complete",
          message: `"${updatedRock.title}" was marked complete.`,
          link: "/rocks",
        }).catch(err => logError(logger, "Rock completion notification failed", err))
      }
    }

    // Fire webhook (best-effort, non-blocking)
    dispatchWebhook(auth.organization.id, "rock.updated", {
      rockId: id,
      title: updatedRock?.title || rock.title,
      status: updatedRock?.status || rock.status,
      progress: updatedRock?.progress ?? rock.progress,
      workspaceId: rock.workspaceId,
    }).catch(err => logError(logger, "Rock update webhook failed", err))

    return NextResponse.json<ApiResponse<Rock | null>>({
      success: true,
      data: updatedRock,
      message: "Rock updated successfully",
    })
  } catch (error) {
    // Handle validation errors
    if (error instanceof ValidationError) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: error.message },
        { status: error.statusCode }
      )
    }

    logError(logger, "Update rock error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update rock" },
      { status: 500 }
    )
  }
})

// DELETE /api/rocks - Delete a rock
export const DELETE = withAuth(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock ID is required" },
        { status: 400 }
      )
    }

    const rock = await db.rocks.findById(id)
    if (!rock) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Verify rock belongs to this organization
    if (rock.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Rock not found" },
        { status: 404 }
      )
    }

    // Only admins or the rock owner can delete
    if (rock.userId !== auth.user.id && !isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only delete your own rocks" },
        { status: 403 }
      )
    }

    await db.rocks.delete(id, auth.organization.id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "Rock deleted successfully",
    })
  } catch (error) {
    logError(logger, "Delete rock error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete rock" },
      { status: 500 }
    )
  }
})
