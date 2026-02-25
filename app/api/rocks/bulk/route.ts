import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { withAdmin, verifyWorkspaceOrgBoundary } from "@/lib/api/middleware"
import { generateId } from "@/lib/auth/password"
import { setTeamMemberMetric } from "@/lib/metrics"
import { aiRateLimit, RATE_LIMITS } from "@/lib/api/rate-limit"
import type { Rock, AssignedTask, ApiResponse } from "@/lib/types"
import { validateBody } from "@/lib/validation/middleware"
import { bulkRockCreateSchema } from "@/lib/validation/schemas"
import { logger, logError } from "@/lib/logger"

interface BulkCreateResponse {
  created: Rock[]
  failed: Array<{ title: string; error: string }>
  metricsSet?: number
  tasksCreated?: number
}

/**
 * POST /api/rocks/bulk
 * Create multiple rocks at once for a user
 */
export const POST = withAdmin(async (request, auth) => {
  try {
    // Rate limit: 10 bulk rock operations per user per hour
    const rateCheck = aiRateLimit(auth.user.id, 'rocks-bulk', RATE_LIMITS.bulk.maxRequests, RATE_LIMITS.bulk.windowMs)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Try again later." },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }

    const { rocks, userId, metrics, tasks, workspaceId } = await validateBody(request, bulkRockCreateSchema)

    // Validate workspace if provided
    if (workspaceId) {
      const isValidWorkspace = await verifyWorkspaceOrgBoundary(workspaceId, auth.organization.id)
      if (!isValidWorkspace) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace not found" },
          { status: 404 }
        )
      }
    }

    // Verify target user is in the organization
    // The userId from frontend can be either:
    // 1. A user.id (for active members who have registered)
    // 2. An organization_member.id (for draft members who haven't registered yet)
    //
    // For draft members (no userId yet), we store their email in owner_email field.
    // When they accept the invitation, pending rocks are transferred to their userId.

    // First, try to find by user_id (active members)
    let targetMember = await db.members.findByOrgAndUser(auth.organization.id, userId)
    let rockUserId: string | undefined
    let rockOwnerEmail: string | undefined

    if (!targetMember) {
      // Not found by user_id, try to find by organization_member.id (draft members)
      targetMember = await db.members.findByOrgAndId(auth.organization.id, userId)
    }

    if (!targetMember) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "User is not a member of this organization" },
        { status: 404 }
      )
    }

    // Check if member has accepted invitation (has userId) or is draft (email only)
    if (targetMember.userId) {
      // Member has accepted - use their user ID
      rockUserId = targetMember.userId
      rockOwnerEmail = undefined
    } else {
      // Draft member - use their email
      rockUserId = undefined
      rockOwnerEmail = targetMember.email
    }

    // Calculate default due date (end of current quarter)
    const now = new Date()
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1
    const quarterEndMonth = currentQuarter * 3
    const defaultDueDate = new Date(now.getFullYear(), quarterEndMonth, 0).toISOString().split("T")[0]
    const defaultQuarter = `Q${currentQuarter} ${now.getFullYear()}`

    const result: BulkCreateResponse = {
      created: [],
      failed: [],
    }

    for (const rockInput of rocks) {
      try {
        if (!rockInput.title || rockInput.title.trim().length < 2) {
          result.failed.push({ title: rockInput.title || "Untitled", error: "Title is required" })
          continue
        }

        const timestamp = new Date().toISOString()
        const rockId = generateId()

        // Create the rock first (store milestones in doneWhen JSONB for backward compatibility)
        const rock: Rock = {
          id: rockId,
          organizationId: auth.organization.id,
          userId: rockUserId,
          ownerEmail: rockOwnerEmail,
          title: rockInput.title.trim(),
          description: rockInput.description?.trim() || "",
          progress: 0,
          dueDate: rockInput.dueDate || defaultDueDate,
          status: "on-track",
          createdAt: timestamp,
          updatedAt: timestamp,
          doneWhen: rockInput.milestones || [], // Store in JSONB for compatibility
          quarter: rockInput.quarter || defaultQuarter,
          workspaceId: workspaceId || undefined,
        }

        await db.rocks.create(rock)

        // Create milestones in the rock_milestones table
        if (rockInput.milestones && rockInput.milestones.length > 0) {
          try {
            await db.rockMilestones.createMany(rockId, rockInput.milestones)
          } catch (milestoneErr) {
            // Log but don't fail the rock creation if milestone table doesn't exist yet
            logger.warn({ rockTitle: rockInput.title, error: milestoneErr }, "Could not create milestones in rock_milestones table")
            // Milestones are still saved in doneWhen JSONB, so this is not a critical failure
          }
        }

        result.created.push(rock)
      } catch (err) {
        logError(logger, `Failed to create rock "${rockInput.title}"`, err)
        result.failed.push({
          title: rockInput.title,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    // Create tasks if provided
    let tasksCreatedCount = 0
    if (tasks && tasks.length > 0 && rockUserId) {
      // Build a title -> id map from the rocks we just created
      const rockTitleMap = new Map(result.created.map((r) => [r.title.toLowerCase(), r]))

      // Fetch assignee name once
      const assigneeMember = await db.members.findWithUsersByOrganizationId(auth.organization.id)
        .then((members) => members.find((m) => m.userId === rockUserId || m.id === rockUserId))

      const assigneeName = assigneeMember?.name || targetMember.name || "Unknown"
      const now = new Date().toISOString()

      for (const taskInput of tasks) {
        try {
          // Match rock by title (case-insensitive)
          const matchedRock = taskInput.rockTitle
            ? rockTitleMap.get(taskInput.rockTitle.toLowerCase())
            : undefined

          // Map "urgent" -> "high" since AssignedTask doesn't have urgent
          const priorityMap: Record<string, "high" | "medium" | "normal" | "low"> = {
            urgent: "high", high: "high", medium: "medium", normal: "normal", low: "low",
          }
          const task: AssignedTask = {
            id: generateId(),
            organizationId: auth.organization.id,
            workspaceId: workspaceId || undefined,
            title: taskInput.title,
            description: taskInput.description || "",
            assigneeId: rockUserId,
            assigneeName,
            assignedById: auth.user.id,
            assignedByName: auth.user.name || "Admin",
            type: "assigned",
            rockId: matchedRock?.id || null,
            rockTitle: matchedRock?.title || null,
            priority: priorityMap[taskInput.priority] || "medium",
            dueDate: taskInput.dueDate || null,
            status: "pending",
            completedAt: null,
            addedToEOD: false,
            eodReportId: null,
            createdAt: now,
            updatedAt: now,
          }
          await db.assignedTasks.create(task)
          tasksCreatedCount++
        } catch (err) {
          logError(logger, `Failed to create task "${taskInput.title}"`, err)
        }
      }
    }

    result.tasksCreated = tasksCreatedCount

    // Process metrics if provided
    let metricsSetCount = 0
    if (metrics && Array.isArray(metrics) && metrics.length > 0) {
      // Get all team members to match by name
      const teamMembers = await db.members.findWithUsersByOrganizationId(auth.organization.id)

      for (const metricInput of metrics) {
        try {
          // Match the assignee by name (fuzzy matching)
          const nameLower = metricInput.assigneeName.toLowerCase()
          const member = teamMembers.find(m =>
            m.name.toLowerCase().includes(nameLower) ||
            nameLower.includes(m.name.toLowerCase())
          )

          if (member && metricInput.metricName && metricInput.weeklyGoal > 0) {
            await setTeamMemberMetric(member.id, metricInput.metricName, metricInput.weeklyGoal)
            metricsSetCount++
          }
        } catch (err) {
          logError(logger, `Failed to set metric for ${metricInput.assigneeName}`, err)
        }
      }
    }

    result.metricsSet = metricsSetCount

    const successCount = result.created.length
    const failCount = result.failed.length

    // If all rocks failed, include the first error message in the error field
    const errorMessage = successCount === 0 && failCount > 0
      ? result.failed[0]?.error || "All rocks failed to create"
      : undefined

    const metricsMessage = metricsSetCount > 0 ? `, ${metricsSetCount} metric(s) set` : ""
    const tasksMessage = tasksCreatedCount > 0 ? `, ${tasksCreatedCount} task(s) created` : ""

    return NextResponse.json<ApiResponse<BulkCreateResponse>>({
      success: successCount > 0,
      data: result,
      error: errorMessage,
      message:
        failCount === 0
          ? `Successfully created ${successCount} rock(s)${tasksMessage}${metricsMessage}`
          : `Created ${successCount} rock(s), ${failCount} failed${tasksMessage}${metricsMessage}`,
    })
  } catch (error) {
    logError(logger, "Bulk rock create error", error)
    const errorMessage = error instanceof Error
      ? error.message
      : "Failed to create rocks"
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: errorMessage },
      { status: 500 }
    )
  }
})
