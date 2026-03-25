import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import { isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { userHasWorkspaceAccess, getWorkspaceMembers } from "@/lib/db/workspaces"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { subDays, subMonths, eachDayOfInterval, format } from "date-fns"
import { isFeatureEnabled, getFeatureGateError } from "@/lib/auth/feature-gate"

/**
 * GET /api/analytics
 * Get analytics data for charts and metrics
 */
export const GET = withAuth(async (request: NextRequest, auth) => {
  try {
    if (!isFeatureEnabled(auth.organization, "basic_analytics")) {
      return getFeatureGateError("basic_analytics")
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const dateRange = searchParams.get("dateRange") || "30d" // 7d, 30d, 90d, 1y

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
          { success: false, error: "Workspace not found" },
          { status: 404 }
        )
      }
    }

    // Calculate date range
    const now = new Date()
    let startDate: Date

    switch (dateRange) {
      case "7d":
        startDate = subDays(now, 7)
        break
      case "90d":
        startDate = subDays(now, 90)
        break
      case "1y":
        startDate = subMonths(now, 12)
        break
      case "30d":
      default:
        startDate = subDays(now, 30)
        break
    }

    // Fetch workspace-specific data — workspace and date filters pushed to SQL
    const [rocks, tasks, eodReports, workspaceMembers, orgMembers] = await Promise.all([
      db.rocks.findByOrganizationId(auth.organization.id, workspaceId),
      db.assignedTasks.findByOrganizationId(auth.organization.id, workspaceId),
      db.eodReports.findByOrganizationId(auth.organization.id, workspaceId, startDate),
      getWorkspaceMembers(workspaceId),
      db.members.findWithUsersByOrganizationId(auth.organization.id),
    ])

    // Get workspace member user IDs for filtering
    const workspaceMemberUserIds = new Set(workspaceMembers.map((wm) => wm.userId))

    // Get full member details for workspace members only
    const members = orgMembers.filter((m) => m.userId && workspaceMemberUserIds.has(m.userId))

    // Date range filtering for rocks/tasks (eodReports already filtered in SQL via startDate)
    const rocksInRange = rocks.filter(
      (r) => new Date(r.createdAt) >= startDate
    )
    const tasksInRange = tasks.filter(
      (t) => new Date(t.createdAt) >= startDate
    )
    const reportsInRange = eodReports // already filtered by workspace + startDate in SQL

    // --- PRE-INDEX: Build lookup maps O(n) so daily iteration is O(1) per day ---

    // Rocks completed by date
    const rocksCompletedByDate = new Map<string, number>()
    for (const r of rocksInRange) {
      if (r.status === "completed") {
        const dayStr = format(new Date(r.updatedAt || r.createdAt), "yyyy-MM-dd")
        rocksCompletedByDate.set(dayStr, (rocksCompletedByDate.get(dayStr) || 0) + 1)
      }
    }

    // Tasks completed by date + tasks created by date
    const tasksCompletedByDate = new Map<string, number>()
    const tasksCreatedByDate = new Map<string, number>()
    for (const t of tasksInRange) {
      const createdDay = format(new Date(t.createdAt), "yyyy-MM-dd")
      tasksCreatedByDate.set(createdDay, (tasksCreatedByDate.get(createdDay) || 0) + 1)
      if (t.status === "completed") {
        const completedDay = format(new Date(t.updatedAt || t.createdAt), "yyyy-MM-dd")
        tasksCompletedByDate.set(completedDay, (tasksCompletedByDate.get(completedDay) || 0) + 1)
      }
    }

    // EOD submissions by date
    const reportsByDate = new Map<string, number>()
    for (const r of reportsInRange) {
      const dayStr = format(new Date(r.date), "yyyy-MM-dd")
      reportsByDate.set(dayStr, (reportsByDate.get(dayStr) || 0) + 1)
    }

    // Per-user aggregations for top performers
    const userTasksCompleted = new Map<string, number>()
    const userRocksCompleted = new Map<string, number>()
    const userReports = new Map<string, number>()
    for (const t of tasksInRange) {
      if (t.status === "completed" && t.assigneeId) {
        userTasksCompleted.set(t.assigneeId, (userTasksCompleted.get(t.assigneeId) || 0) + 1)
      }
    }
    for (const r of rocksInRange) {
      if (r.status === "completed" && r.userId) {
        userRocksCompleted.set(r.userId, (userRocksCompleted.get(r.userId) || 0) + 1)
      }
    }
    for (const r of reportsInRange) {
      if (r.userId) {
        userReports.set(r.userId, (userReports.get(r.userId) || 0) + 1)
      }
    }

    // --- GENERATE CHART DATA: O(days) with O(1) lookups ---

    const days = eachDayOfInterval({ start: startDate, end: now })

    // 1. ROCK COMPLETION TREND
    const rockCompletionData = days.map((day) => ({
      date: format(day, "MMM dd"),
      completed: rocksCompletedByDate.get(format(day, "yyyy-MM-dd")) || 0,
    }))

    // 2. TASK COMPLETION TREND
    const taskCompletionData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd")
      return {
        date: format(day, "MMM dd"),
        completed: tasksCompletedByDate.get(dayStr) || 0,
        created: tasksCreatedByDate.get(dayStr) || 0,
      }
    })

    // 3. EOD SUBMISSION TREND
    const eodSubmissionData = days.map((day) => ({
      date: format(day, "MMM dd"),
      submissions: reportsByDate.get(format(day, "yyyy-MM-dd")) || 0,
    }))

    // 4. OVERALL METRICS
    const totalRocks = rocks.length
    const completedRocks = rocks.filter((r) => r.status === "completed").length
    const rockCompletionRate = totalRocks > 0 ? Math.round((completedRocks / totalRocks) * 100) : 0

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.status === "completed").length
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const totalExpectedReports = members.filter((m) => m.status === "active").length * days.length
    const actualReports = reportsInRange.length
    const eodCompletionRate = totalExpectedReports > 0 ? Math.round((actualReports / totalExpectedReports) * 100) : 0

    // 5. TOP PERFORMERS (O(members) with pre-indexed Maps)
    const activeMembers = members.filter((m) => m.status === "active")
    const topPerformers = activeMembers
      .map((member) => {
        const tc = userTasksCompleted.get(member.userId!) || 0
        const rc = userRocksCompleted.get(member.userId!) || 0
        const er = userReports.get(member.userId!) || 0
        const score = tc * 1 + rc * 5 + er * 2
        return {
          userId: member.userId,
          name: member.name,
          avatar: member.avatar,
          tasksCompleted: tc,
          rocksCompleted: rc,
          eodReports: er,
          score,
        }
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    // 6. TEAM ACTIVITY BY DAY OF WEEK (O(days) with pre-indexed Maps)
    const dayOfWeekActivity = days.reduce((acc, day) => {
      const dayName = format(day, "EEEE")
      const dayStr = format(day, "yyyy-MM-dd")

      if (!acc[dayName]) {
        acc[dayName] = { tasks: 0, reports: 0, count: 0 }
      }

      acc[dayName].tasks += tasksCompletedByDate.get(dayStr) || 0
      acc[dayName].reports += reportsByDate.get(dayStr) || 0
      acc[dayName].count += 1

      return acc
    }, {} as Record<string, { tasks: number; reports: number; count: number }>)

    const activityByDayOfWeek = Object.entries(dayOfWeekActivity).map(([day, data]) => ({
      day,
      avgTasks: Math.round(data.tasks / data.count),
      avgReports: Math.round(data.reports / data.count),
    }))

    return NextResponse.json<ApiResponse<{
      rockCompletionData: typeof rockCompletionData
      taskCompletionData: typeof taskCompletionData
      eodSubmissionData: typeof eodSubmissionData
      metrics: {
        rockCompletionRate: number
        taskCompletionRate: number
        eodCompletionRate: number
        totalRocks: number
        completedRocks: number
        totalTasks: number
        completedTasks: number
        totalReports: number
      }
      topPerformers: typeof topPerformers
      activityByDayOfWeek: typeof activityByDayOfWeek
    }>>({
      success: true,
      data: {
        rockCompletionData,
        taskCompletionData,
        eodSubmissionData,
        metrics: {
          rockCompletionRate,
          taskCompletionRate,
          eodCompletionRate,
          totalRocks,
          completedRocks,
          totalTasks,
          completedTasks,
          totalReports: actualReports,
        },
        topPerformers,
        activityByDayOfWeek,
      },
    })
  } catch (error) {
    logError(logger, "Get analytics error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    )
  }
})
