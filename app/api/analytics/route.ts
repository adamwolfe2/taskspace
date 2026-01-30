import { NextRequest, NextResponse } from "next/server"
import { getAuthContext, isAdmin } from "@/lib/auth/middleware"
import { db } from "@/lib/db"
import { userHasWorkspaceAccess, getWorkspaceMembers } from "@/lib/db/workspaces"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, format } from "date-fns"

/**
 * GET /api/analytics
 * Get analytics data for charts and metrics
 */
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
          { success: false, error: "You don't have access to this workspace" },
          { status: 403 }
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

    // Fetch workspace-specific data
    const [rocks, tasks, eodReports, workspaceMembers, orgMembers] = await Promise.all([
      db.rocks.findByOrganizationId(auth.organization.id),
      db.assignedTasks.findByOrganizationId(auth.organization.id),
      db.eodReports.findByOrganizationId(auth.organization.id),
      getWorkspaceMembers(workspaceId),
      db.members.findWithUsersByOrganizationId(auth.organization.id),
    ])

    // ALWAYS filter by workspace - enforce workspace isolation
    const filteredRocks = rocks.filter((r) => r.workspaceId === workspaceId)
    const filteredTasks = tasks.filter((t) => t.workspaceId === workspaceId)
    const filteredReports = eodReports.filter((r) => r.workspaceId === workspaceId)

    // Get workspace member user IDs for filtering
    const workspaceMemberUserIds = new Set(workspaceMembers.map((wm) => wm.userId))

    // Get full member details for workspace members only
    const members = orgMembers.filter((m) => workspaceMemberUserIds.has(m.userId))

    // Filter by date range
    const rocksInRange = filteredRocks.filter(
      (r) => new Date(r.createdAt) >= startDate
    )
    const tasksInRange = filteredTasks.filter(
      (t) => new Date(t.createdAt) >= startDate
    )
    const reportsInRange = filteredReports.filter(
      (r) => new Date(r.date) >= startDate
    )

    // Generate daily intervals
    const days = eachDayOfInterval({ start: startDate, end: now })
    const dateLabels = days.map((day) => format(day, "MMM dd"))

    // 1. ROCK COMPLETION TREND
    const rockCompletionData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd")
      const rocksCompleted = rocksInRange.filter(
        (r) => r.status === "completed" && format(new Date(r.updatedAt || r.createdAt), "yyyy-MM-dd") === dayStr
      ).length
      return {
        date: format(day, "MMM dd"),
        completed: rocksCompleted,
      }
    })

    // 2. TASK COMPLETION TREND
    const taskCompletionData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd")
      const tasksCompleted = tasksInRange.filter(
        (t) => t.status === "completed" && format(new Date(t.updatedAt || t.createdAt), "yyyy-MM-dd") === dayStr
      ).length
      const tasksCreated = tasksInRange.filter(
        (t) => format(new Date(t.createdAt), "yyyy-MM-dd") === dayStr
      ).length
      return {
        date: format(day, "MMM dd"),
        completed: tasksCompleted,
        created: tasksCreated,
      }
    })

    // 3. EOD SUBMISSION TREND
    const eodSubmissionData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd")
      const submissions = reportsInRange.filter(
        (r) => format(new Date(r.date), "yyyy-MM-dd") === dayStr
      ).length
      return {
        date: format(day, "MMM dd"),
        submissions,
      }
    })

    // 4. OVERALL METRICS
    const totalRocks = filteredRocks.length
    const completedRocks = filteredRocks.filter((r) => r.status === "completed").length
    const rockCompletionRate = totalRocks > 0 ? Math.round((completedRocks / totalRocks) * 100) : 0

    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter((t) => t.status === "completed").length
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    const totalExpectedReports = members.filter((m) => m.status === "active").length * days.length
    const actualReports = reportsInRange.length
    const eodCompletionRate = totalExpectedReports > 0 ? Math.round((actualReports / totalExpectedReports) * 100) : 0

    // 5. TOP PERFORMERS
    const activeMembers = members.filter((m) => m.status === "active")
    const topPerformers = activeMembers
      .map((member) => {
        const memberTasks = tasksInRange.filter(
          (t) => t.userId === member.userId && t.status === "completed"
        )
        const memberRocks = rocksInRange.filter(
          (r) => r.userId === member.userId && r.status === "completed"
        )
        const memberReports = reportsInRange.filter((r) => r.userId === member.userId)

        const score = memberTasks.length * 1 + memberRocks.length * 5 + memberReports.length * 2

        return {
          userId: member.userId,
          name: member.name,
          avatar: member.avatar,
          tasksCompleted: memberTasks.length,
          rocksCompleted: memberRocks.length,
          eodReports: memberReports.length,
          score,
        }
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    // 6. TEAM ACTIVITY BY DAY OF WEEK
    const dayOfWeekActivity = days.reduce((acc, day) => {
      const dayName = format(day, "EEEE")
      const dayStr = format(day, "yyyy-MM-dd")

      const dayTasks = tasksInRange.filter(
        (t) => t.status === "completed" && format(new Date(t.updatedAt || t.createdAt), "yyyy-MM-dd") === dayStr
      ).length

      const dayReports = reportsInRange.filter(
        (r) => format(new Date(r.date), "yyyy-MM-dd") === dayStr
      ).length

      if (!acc[dayName]) {
        acc[dayName] = { tasks: 0, reports: 0, count: 0 }
      }

      acc[dayName].tasks += dayTasks
      acc[dayName].reports += dayReports
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
}
