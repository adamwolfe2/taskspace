import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { generateId } from "@/lib/auth/password"
import { parseEODReport, isClaudeConfigured } from "@/lib/ai/claude-client"
import { generateEODSuggestions } from "@/lib/ai/eod-suggestions"
import { sendEscalationNotification, sendAIAlertEmail, isEmailConfigured } from "@/lib/integrations/email"
import { sendSlackMessage, buildFullEODReportMessage, isSlackConfigured } from "@/lib/integrations/slack"
import { asanaClient } from "@/lib/integrations/asana"
import { getActiveMetricForUser, upsertWeeklyMetricEntry } from "@/lib/metrics"
import { getTodayInTimezone, isValidEODDate, formatDateForDisplay } from "@/lib/utils/date-utils"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"
import type { EODReport, EODInsight, ApiResponse, TeamMember, Notification } from "@/lib/types"
import { format, subDays } from "date-fns"
import { logger, logError } from "@/lib/logger"

// GET /api/eod-reports - Get EOD reports
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const date = searchParams.get("date")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const workspaceId = searchParams.get("workspaceId")

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Validate workspace access (unless org admin)
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
        )
      }
    }

    let reports: EODReport[]

    // OPTIMIZED: Default to last 90 days to reduce data transfer
    // This significantly reduces Vercel Postgres bandwidth usage
    const today = new Date()
    const defaultStartDate = format(subDays(today, 90), "yyyy-MM-dd")
    const defaultEndDate = format(today, "yyyy-MM-dd")
    const effectiveStartDate = startDate || defaultStartDate
    const effectiveEndDate = endDate || defaultEndDate

    // Determine which user(s) to fetch for
    const targetUserId = isAdmin(auth) && userId ? userId : (isAdmin(auth) ? null : auth.user.id)

    if (targetUserId) {
      // Fetch reports for a specific user with date range
      reports = await db.eodReports.findByUserIdsWithDateRange(
        [targetUserId],
        auth.organization.id,
        date || effectiveStartDate,
        date || effectiveEndDate
      )
    } else if (isAdmin(auth)) {
      // Admin fetching all users - still apply date range limit
      // Get all members first
      const members = await db.members.findWithUsersByOrganizationId(auth.organization.id)
      const userIds = members.filter(m => m.userId).map(m => m.userId as string)

      if (userIds.length > 0) {
        reports = await db.eodReports.findByUserIdsWithDateRange(
          userIds,
          auth.organization.id,
          date || effectiveStartDate,
          date || effectiveEndDate
        )
      } else {
        reports = []
      }
    } else {
      // Regular member - only their own reports
      reports = await db.eodReports.findByUserIdsWithDateRange(
        [auth.user.id],
        auth.organization.id,
        date || effectiveStartDate,
        date || effectiveEndDate
      )
    }

    // ALWAYS filter by workspace - enforce workspace isolation
    reports = reports.filter((report) => report.workspaceId === workspaceId)

    // Sort by date descending (already done in DB, but ensure consistency)
    reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json<ApiResponse<EODReport[]>>({
      success: true,
      data: reports,
    })
  } catch (error) {
    logError(logger, "Get EOD reports error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get EOD reports" },
      { status: 500 }
    )
  }
}

// POST /api/eod-reports - Submit an EOD report
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      tasks,
      challenges,
      tomorrowPriorities,
      needsEscalation,
      escalationNote,
      metricValueToday,
      date,
      attachments,
      workspaceId,
    } = body

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one completed task is required" },
        { status: 400 }
      )
    }

    if (!tomorrowPriorities || !Array.isArray(tomorrowPriorities) || tomorrowPriorities.length === 0) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "At least one priority for tomorrow is required" },
        { status: 400 }
      )
    }

    // CRITICAL: workspaceId is REQUIRED for data isolation
    if (!workspaceId) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      )
    }

    // Validate workspace access (unless org admin)
    if (!isAdmin(auth)) {
      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
        )
      }
    }

    // Get the organization's timezone (default to PST)
    const orgTimezone = auth.organization.settings?.timezone || "America/Los_Angeles"
    const todayInOrgTz = getTodayInTimezone(orgTimezone)

    // Use provided date or default to today in the org's timezone (NOT UTC!)
    const reportDate = date || todayInOrgTz

    // Validate the date is reasonable (today or yesterday in org timezone)
    const dateValidation = isValidEODDate(reportDate, orgTimezone)
    if (!dateValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        {
          success: false,
          error: dateValidation.reason,
          data: null,
          // Include helpful info for debugging
          meta: {
            providedDate: date,
            todayInOrgTimezone: todayInOrgTz,
            orgTimezone,
            suggestedDate: dateValidation.suggestedDate,
          }
        },
        { status: 400 }
      )
    }

    // Multiple EOD reports per day are allowed - no duplicate check needed
    // Users can submit as many reports as they want for any valid date

    const now = new Date().toISOString()

    // Parse metric value - ensure it's a valid number or null
    const parsedMetricValue = metricValueToday !== undefined && metricValueToday !== null && metricValueToday !== ""
      ? parseInt(String(metricValueToday), 10)
      : null
    const validMetricValue = parsedMetricValue !== null && !isNaN(parsedMetricValue)
      ? parsedMetricValue
      : null

    const report: EODReport = {
      id: generateId(),
      organizationId: auth.organization.id,
      workspaceId: workspaceId, // Required - validated above
      userId: auth.user.id,
      date: reportDate,
      tasks,
      challenges: challenges || "",
      tomorrowPriorities,
      needsEscalation: needsEscalation || false,
      escalationNote: needsEscalation ? escalationNote : null,
      metricValueToday: validMetricValue,
      attachments: attachments && Array.isArray(attachments) && attachments.length > 0 ? attachments : undefined,
      submittedAt: now,
      createdAt: now,
    }

    await db.eodReports.create(report)

    // Update weekly metric aggregation if user has a metric defined
    if (validMetricValue !== null) {
      const activeMetric = await getActiveMetricForUser(auth.user.id, auth.organization.id)
      if (activeMetric) {
        // Fire-and-forget - don't block EOD submission
        upsertWeeklyMetricEntry(auth.user.id, auth.organization.id, activeMetric.id)
          .catch(err => logError(logger, "Failed to update weekly metric entry", err, { userId: auth.user.id }))
      }
    }

    // Mark any completed tasks as added to EOD and sync to Asana
    for (const task of tasks) {
      if (task.taskId) {
        const assignedTask = await db.assignedTasks.findById(task.taskId)
        if (assignedTask && assignedTask.assigneeId === auth.user.id) {
          await db.assignedTasks.update(task.taskId, {
            addedToEOD: true,
            eodReportId: report.id,
            status: "completed",
            completedAt: now,
          })

          // Sync completion to Asana if task has an asanaGid
          if (assignedTask.asanaGid && asanaClient.isConfigured()) {
            try {
              await asanaClient.completeTask(assignedTask.asanaGid)
              logger.info({ taskId: task.taskId, asanaGid: assignedTask.asanaGid }, "Synced task completion to Asana")
            } catch (asanaErr) {
              // Log but don't fail - Asana sync is best-effort
              logError(logger, "Failed to sync task completion to Asana", asanaErr, { taskId: task.taskId, asanaGid: assignedTask.asanaGid })
            }
          }
        }
      }
    }

    // Get team members for email notifications and AI context
    const teamMembersData = await db.members.findWithUsersByOrganizationId(auth.organization.id)
    const member = teamMembersData.find(m => m.id === auth.user.id)

    // AI: Parse EOD report asynchronously (fire-and-forget)
    if (isClaudeConfigured() && member) {
      // Get user's rocks for context
      const rocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id)

      // Parse EOD with AI in background (don't await)
      parseEODReport(report, member.name, member.department, rocks)
        .then(async (result) => {
          // Create insight record
          const insight: EODInsight = {
            id: generateId(),
            organizationId: auth.organization.id,
            eodReportId: report.id,
            ...result.insight,
            processedAt: new Date().toISOString(),
          }
          await db.eodInsights.create(insight)

          // Generate AI suggestions for the inbox
          const admins = teamMembersData.filter(m => m.role === "admin" || m.role === "owner")
          generateEODSuggestions({
            organizationId: auth.organization.id,
            report,
            insight,
            member: {
              id: member.id,
              name: member.name,
              department: member.department,
            },
            adminIds: admins.map(a => a.id),
          }).catch(err => logError(logger, "AI suggestions generation failed", err, { reportId: report.id }))

          // Log if admin alert is needed
          if (result.alertAdmin && result.alertReason) {
            logger.info({ memberName: member.name, reason: result.alertReason }, "AI alert triggered for admin")
            // Send email notification to admins
            if (isEmailConfigured()) {
              const adminMembers: TeamMember[] = admins.map(a => ({
                id: a.id,
                name: a.name,
                email: a.email,
                role: a.role,
                department: a.department,
                joinDate: a.joinDate,
              }))

              const alertType = result.insight.sentiment === "negative" || result.insight.sentiment === "stressed"
                ? "sentiment"
                : result.insight.blockers && result.insight.blockers.length > 0
                ? "blocker"
                : "pattern"

              sendAIAlertEmail(
                alertType,
                member.name,
                member.department,
                result.alertReason,
                result.insight.aiSummary,
                adminMembers
              ).catch(err => logError(logger, "AI alert email failed", err, { memberName: member.name }))
            }
          }
        })
        .catch((err) => {
          logError(logger, "AI EOD parsing failed", err, { reportId: report.id })
        })
    }

    // Send full EOD report via Slack if enabled
    const webhookUrl = auth.organization.settings?.slackWebhookUrl
    if (isSlackConfigured(webhookUrl) && member) {
      // Get rock titles for tasks and priorities
      const taskRocks = await db.rocks.findByUserId(auth.user.id, auth.organization.id)
      const rockMap = new Map(taskRocks.map(r => [r.id, r.title]))

      const tasksWithRockTitles = (report.tasks || []).map(t => ({
        ...t,
        rockTitle: t.rockId ? rockMap.get(t.rockId) : undefined,
      }))
      const prioritiesWithRockTitles = (report.tomorrowPriorities || []).map(p => ({
        ...p,
        rockTitle: p.rockId ? rockMap.get(p.rockId) : undefined,
      }))

      const fullEODMessage = buildFullEODReportMessage(
        member.name,
        member.department,
        report.date,
        tasksWithRockTitles,
        report.challenges,
        prioritiesWithRockTitles,
        report.needsEscalation,
        report.escalationNote
      )
      sendSlackMessage(webhookUrl!, fullEODMessage)
        .catch(err => logError(logger, "Slack EOD report notification failed", err))
    }

    // Send escalation email notification if needed
    if (report.needsEscalation && isEmailConfigured() && member) {
      const admins = teamMembersData.filter(m => m.role === "admin" || m.role === "owner")
      const adminMembers: TeamMember[] = admins.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        department: a.department,
        joinDate: a.joinDate,
      }))

      const memberInfo: TeamMember = {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        department: member.department,
        joinDate: member.joinDate,
      }

      sendEscalationNotification(report, memberInfo, adminMembers)
        .catch(err => logError(logger, "Escalation email notification failed", err, { reportId: report.id }))

      // Note: Escalation is now included in the full EOD report sent to Slack above

      // Create in-app notifications for admins
      for (const admin of admins) {
        const notification: Notification = {
          id: generateId(),
          organizationId: auth.organization.id,
          userId: admin.id,
          type: "escalation",
          title: "Escalation from " + member.name,
          message: report.escalationNote || "Team member flagged an escalation",
          read: false,
          createdAt: new Date().toISOString(),
          actionUrl: "/admin",
          metadata: { reportId: report.id, memberName: member.name },
        }
        await db.notifications.create(notification).catch(err => {
          logError(logger, "Failed to create escalation notification", err, { adminId: admin.id })
        })
      }
    }

    return NextResponse.json<ApiResponse<EODReport>>({
      success: true,
      data: report,
      message: "EOD report submitted successfully",
    })
  } catch (error) {
    logError(logger, "Submit EOD report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to submit EOD report" },
      { status: 500 }
    )
  }
}

// PATCH /api/eod-reports - Update an EOD report (supports date changes to move reports between days)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { id, date: newDate, ...updates } = body

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report ID is required" },
        { status: 400 }
      )
    }

    const report = await db.eodReports.findById(id)
    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    // Verify report belongs to this organization
    if (report.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    // Only the report author can update
    if (report.userId !== auth.user.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "You can only update your own reports" },
        { status: 403 }
      )
    }

    const orgTimezone = auth.organization.settings?.timezone || "America/Los_Angeles"

    // If changing the date, validate the new date
    if (newDate && newDate !== report.date) {
      const newDateValidation = isValidEODDate(newDate, orgTimezone)
      if (!newDateValidation.valid) {
        return NextResponse.json<ApiResponse<null>>(
          {
            success: false,
            error: `Cannot move report to ${formatDateForDisplay(newDate)}: ${newDateValidation.reason}`
          },
          { status: 400 }
        )
      }
    }

    // Can only update reports within the valid submission window (today or up to 2 days back)
    // Check the original date is still editable
    const originalDateValidation = isValidEODDate(report.date, orgTimezone)
    if (!originalDateValidation.valid) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: `Cannot update this report: ${originalDateValidation.reason}` },
        { status: 400 }
      )
    }

    const updatedReport = await db.eodReports.update(id, {
      ...updates,
      date: newDate || report.date,
      submittedAt: new Date().toISOString(),
    })

    const message = newDate && newDate !== report.date
      ? `EOD report moved to ${formatDateForDisplay(newDate)}`
      : "EOD report updated successfully"

    return NextResponse.json<ApiResponse<EODReport | null>>({
      success: true,
      data: updatedReport,
      message,
    })
  } catch (error) {
    logError(logger, "Update EOD report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to update EOD report" },
      { status: 500 }
    )
  }
}

// DELETE /api/eod-reports - Delete an EOD report (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    if (!isAdmin(auth)) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Only admins can delete EOD reports" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report ID is required" },
        { status: 400 }
      )
    }

    const report = await db.eodReports.findById(id)
    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    // Verify report belongs to this organization
    if (report.organizationId !== auth.organization.id) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    await db.eodReports.delete(id)

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: "EOD report deleted successfully",
    })
  } catch (error) {
    logError(logger, "Delete EOD report error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to delete EOD report" },
      { status: 500 }
    )
  }
}
