import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getAuthContext } from "@/lib/auth/middleware"
import type {
  ApiResponse,
  ManagerDashboard,
  DirectReport,
  DirectReportMetrics,
  DirectReportActivity,
  DirectReportRock,
  EODStatus,
  TeamSummary,
  ManagerAlert,
  ManagerInsight,
  AssignedTask,
  Rock,
  EODReport,
} from "@/lib/types"
import {
  format,
  parseISO,
  differenceInDays,
  startOfWeek,
  startOfMonth,
  subDays,
} from "date-fns"

// GET /api/manager/dashboard - Get complete manager dashboard with direct reports
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContext(request)
    if (!auth) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const managerId = auth.user.id
    const orgId = auth.organization.id
    const today = new Date()

    // Get all direct reports
    const directReportMembers = await db.members.findDirectReports(orgId, managerId)

    if (directReportMembers.length === 0) {
      // Return empty dashboard if no direct reports
      const emptyDashboard: ManagerDashboard = {
        manager: {
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          avatar: auth.user.avatar,
          department: auth.member.department,
          jobTitle: auth.member.jobTitle,
        },
        teamSummary: {
          totalMembers: 0,
          activeMembers: 0,
          totalPendingTasks: 0,
          totalOverdueTasks: 0,
          avgTaskCompletionRate: 0,
          tasksCompletedThisWeek: 0,
          totalActiveRocks: 0,
          rocksOnTrack: 0,
          rocksAtRisk: 0,
          rocksBlocked: 0,
          avgRockProgress: 0,
          eodSubmissionRateToday: 0,
          eodSubmissionRate7Days: 0,
          avgEodStreak: 0,
          teamSentiment: "neutral",
          activeEscalations: 0,
          unaddressedBlockers: 0,
        },
        directReports: [],
        alerts: [],
        insights: [],
      }

      return NextResponse.json<ApiResponse<ManagerDashboard>>({
        success: true,
        data: emptyDashboard,
      })
    }

    // Get all tasks for the organization
    const allTasks = await db.assignedTasks.findByOrganizationId(orgId)

    // Get all rocks for the organization
    const allRocks = await db.rocks.findByOrganizationId(orgId)

    // Get all EOD reports for the organization
    const allEodReports = await db.eodReports.findByOrganizationId(orgId)

    // Build detailed reports for each direct report
    const directReports: DirectReport[] = await Promise.all(
      directReportMembers.map(async (member) => {
        if (!member.userId) {
          // Handle draft members without user IDs
          return createEmptyDirectReport(member)
        }

        const userId = member.userId

        // Filter data for this user
        const userTasks = allTasks.filter((t) => t.assigneeId === userId)
        const userRocks = allRocks.filter((r) => r.userId === userId)
        const userEodReports = allEodReports
          .filter((e) => e.userId === userId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        // Calculate metrics
        const metrics = calculateMetrics(userTasks, userRocks, userEodReports, today)

        // Calculate EOD status
        const eodStatus = calculateEodStatus(userEodReports, today)

        // Get recent activity
        const recentActivity = calculateRecentActivity(userTasks, userRocks, userEodReports, today)

        // Get current rocks
        const rocks: DirectReportRock[] = userRocks
          .filter((r) => r.status !== "completed")
          .map((r) => ({
            id: r.id,
            title: r.title,
            progress: r.progress,
            status: r.status,
            dueDate: r.dueDate,
            quarter: r.quarter,
          }))

        return {
          id: member.id,
          userId: userId,
          name: member.name,
          email: member.email,
          avatar: member.avatar,
          department: member.department,
          jobTitle: member.jobTitle,
          status: member.status || "active",
          joinDate: member.joinDate,
          metrics,
          recentActivity,
          rocks,
          eodStatus,
        }
      })
    )

    // Calculate team summary
    const teamSummary = calculateTeamSummary(directReports, today)

    // Generate alerts
    const alerts = generateAlerts(directReports, today)

    // Generate insights
    const insights = generateInsights(directReports, teamSummary)

    const dashboard: ManagerDashboard = {
      manager: {
        id: auth.user.id,
        name: auth.user.name,
        email: auth.user.email,
        avatar: auth.user.avatar,
        department: auth.member.department,
        jobTitle: auth.member.jobTitle,
      },
      teamSummary,
      directReports,
      alerts,
      insights,
    }

    return NextResponse.json<ApiResponse<ManagerDashboard>>({
      success: true,
      data: dashboard,
    })
  } catch (error) {
    console.error("Manager dashboard error:", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to load manager dashboard" },
      { status: 500 }
    )
  }
}

function createEmptyDirectReport(member: {
  id: string
  userId: string | null
  name: string
  email: string
  avatar?: string
  department: string
  jobTitle?: string
  status?: string
  joinDate: string
}): DirectReport {
  return {
    id: member.id,
    userId: member.userId || member.id,
    name: member.name,
    email: member.email,
    avatar: member.avatar,
    department: member.department,
    jobTitle: member.jobTitle,
    status: (member.status as DirectReport["status"]) || "pending",
    joinDate: member.joinDate,
    metrics: {
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      taskCompletionRate: 0,
      tasksCompletedThisWeek: 0,
      tasksCompletedLastWeek: 0,
      avgTasksPerWeek: 0,
      totalRocks: 0,
      onTrackRocks: 0,
      atRiskRocks: 0,
      blockedRocks: 0,
      completedRocks: 0,
      avgRockProgress: 0,
      eodSubmittedToday: false,
      eodStreakDays: 0,
      eodSubmissionRateLast30Days: 0,
      escalationsThisMonth: 0,
      blockersMentioned: 0,
    },
    recentActivity: {
      recentTasksCompleted: [],
      upcomingDeadlines: [],
    },
    rocks: [],
    eodStatus: {
      submittedToday: false,
      streakDays: 0,
      needsEscalation: false,
    },
  }
}

function calculateMetrics(
  tasks: AssignedTask[],
  rocks: Rock[],
  eodReports: EODReport[],
  today: Date
): DirectReportMetrics {
  const todayStr = format(today, "yyyy-MM-dd")
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const lastWeekStart = subDays(weekStart, 7)
  const monthStart = startOfMonth(today)
  const thirtyDaysAgo = subDays(today, 30)

  // Task metrics
  const completedTasks = tasks.filter((t) => t.status === "completed").length
  const pendingTasks = tasks.filter((t) => t.status !== "completed").length
  const overdueTasks = tasks.filter((t) => {
    if (t.status === "completed") return false
    if (!t.dueDate) return false
    return parseISO(t.dueDate) < today
  }).length

  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

  const tasksCompletedThisWeek = tasks.filter((t) => {
    if (t.status !== "completed" || !t.completedAt) return false
    const completedDate = parseISO(t.completedAt)
    return completedDate >= weekStart
  }).length

  const tasksCompletedLastWeek = tasks.filter((t) => {
    if (t.status !== "completed" || !t.completedAt) return false
    const completedDate = parseISO(t.completedAt)
    return completedDate >= lastWeekStart && completedDate < weekStart
  }).length

  // Rock metrics
  const activeRocks = rocks.filter((r) => r.status !== "completed")
  const onTrackRocks = rocks.filter((r) => r.status === "on-track").length
  const atRiskRocks = rocks.filter((r) => r.status === "at-risk").length
  const blockedRocks = rocks.filter((r) => r.status === "blocked").length
  const completedRocks = rocks.filter((r) => r.status === "completed").length
  const avgRockProgress =
    activeRocks.length > 0
      ? Math.round(activeRocks.reduce((sum, r) => sum + r.progress, 0) / activeRocks.length)
      : 0

  // EOD metrics
  const eodSubmittedToday = eodReports.some((e) => e.date === todayStr)
  const eodStreakDays = calculateEodStreak(eodReports, today)
  const reportsLast30Days = eodReports.filter((e) => parseISO(e.date) >= thirtyDaysAgo).length
  const eodSubmissionRateLast30Days = Math.round((reportsLast30Days / 30) * 100)

  // Escalation metrics
  const escalationsThisMonth = eodReports.filter((e) => {
    return parseISO(e.date) >= monthStart && e.needsEscalation
  }).length

  // Calculate blockers mentioned (from challenges field)
  const blockersMentioned = eodReports
    .filter((e) => parseISO(e.date) >= monthStart)
    .filter((e) => e.challenges && e.challenges.trim().length > 0).length

  return {
    totalTasks: tasks.length,
    completedTasks,
    pendingTasks,
    overdueTasks,
    taskCompletionRate,
    tasksCompletedThisWeek,
    tasksCompletedLastWeek,
    avgTasksPerWeek: Math.round((completedTasks / Math.max(1, 4)) * 10) / 10, // Approximate
    totalRocks: rocks.length,
    onTrackRocks,
    atRiskRocks,
    blockedRocks,
    completedRocks,
    avgRockProgress,
    eodSubmittedToday,
    eodStreakDays,
    eodSubmissionRateLast30Days,
    lastEodDate: eodReports[0]?.date,
    escalationsThisMonth,
    blockersMentioned,
  }
}

function calculateEodStreak(
  eodReports: EODReport[],
  today: Date
): number {
  const sortedDates = eodReports
    .map((r) => r.date)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (sortedDates.length === 0) return 0

  let streak = 0
  let expectedDate = today
  const todayStr = format(today, "yyyy-MM-dd")

  // Check if today has an EOD
  if (sortedDates.includes(todayStr)) {
    streak = 1
    expectedDate = subDays(today, 1)
  }

  for (const dateStr of sortedDates) {
    if (dateStr === todayStr) continue

    const date = parseISO(dateStr)
    const diff = differenceInDays(expectedDate, date)

    if (diff === 0) {
      streak++
      expectedDate = subDays(expectedDate, 1)
    } else if (diff === 1 && streak === 0) {
      streak = 1
      expectedDate = subDays(date, 1)
    } else {
      break
    }
  }

  return streak
}

function calculateEodStatus(
  eodReports: EODReport[],
  today: Date
): EODStatus {
  const todayStr = format(today, "yyyy-MM-dd")
  const todayReport = eodReports.find((e) => e.date === todayStr)
  const lastReport = eodReports[0]

  return {
    submittedToday: !!todayReport,
    lastSubmittedAt: lastReport?.submittedAt,
    lastSubmittedDate: lastReport?.date,
    streakDays: calculateEodStreak(eodReports, today),
    needsEscalation: todayReport?.needsEscalation || false,
    escalationNote: todayReport?.escalationNote || undefined,
    tasksReported: todayReport?.tasks?.length || 0,
    prioritiesSet: todayReport?.tomorrowPriorities?.length || 0,
  }
}

function calculateRecentActivity(
  tasks: AssignedTask[],
  rocks: Rock[],
  eodReports: EODReport[],
  today: Date
): DirectReportActivity {
  // Recent completed tasks (last 5)
  const recentTasksCompleted = tasks
    .filter((t) => t.status === "completed" && t.completedAt)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completedAt!,
      rockTitle: t.rockTitle || undefined,
    }))

  // Recent EOD summary
  const lastEod = eodReports[0]
  const recentEodSummary = lastEod
    ? `${lastEod.tasks?.length || 0} tasks completed, ${lastEod.tomorrowPriorities?.length || 0} priorities set`
    : undefined

  // Upcoming deadlines (tasks and rocks)
  const upcomingDeadlines: DirectReportActivity["upcomingDeadlines"] = []

  // Add upcoming tasks
  tasks
    .filter((t) => t.status !== "completed" && t.dueDate)
    .filter((t) => {
      const due = parseISO(t.dueDate)
      return differenceInDays(due, today) <= 7 && differenceInDays(due, today) >= 0
    })
    .forEach((t) => {
      upcomingDeadlines.push({
        id: t.id,
        title: t.title,
        type: "task",
        dueDate: t.dueDate,
        priority: t.priority,
      })
    })

  // Add upcoming rocks
  rocks
    .filter((r) => r.status !== "completed")
    .filter((r) => {
      const due = parseISO(r.dueDate)
      return differenceInDays(due, today) <= 14 && differenceInDays(due, today) >= 0
    })
    .forEach((r) => {
      upcomingDeadlines.push({
        id: r.id,
        title: r.title,
        type: "rock",
        dueDate: r.dueDate,
      })
    })

  // Sort by due date
  upcomingDeadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return {
    lastActive: lastEod?.submittedAt,
    recentTasksCompleted,
    recentEodSummary,
    upcomingDeadlines: upcomingDeadlines.slice(0, 5),
  }
}

function calculateTeamSummary(directReports: DirectReport[], _today: Date): TeamSummary {
  const activeMembers = directReports.filter((r) => r.status === "active").length

  // Aggregate metrics
  const totalPendingTasks = directReports.reduce((sum, r) => sum + r.metrics.pendingTasks, 0)
  const totalOverdueTasks = directReports.reduce((sum, r) => sum + r.metrics.overdueTasks, 0)
  const tasksCompletedThisWeek = directReports.reduce(
    (sum, r) => sum + r.metrics.tasksCompletedThisWeek,
    0
  )

  // Average task completion rate
  const avgTaskCompletionRate =
    directReports.length > 0
      ? Math.round(
          directReports.reduce((sum, r) => sum + r.metrics.taskCompletionRate, 0) /
            directReports.length
        )
      : 0

  // Rock metrics
  const totalActiveRocks = directReports.reduce(
    (sum, r) => sum + r.rocks.filter((rock) => rock.status !== "completed").length,
    0
  )
  const rocksOnTrack = directReports.reduce((sum, r) => sum + r.metrics.onTrackRocks, 0)
  const rocksAtRisk = directReports.reduce((sum, r) => sum + r.metrics.atRiskRocks, 0)
  const rocksBlocked = directReports.reduce((sum, r) => sum + r.metrics.blockedRocks, 0)

  const avgRockProgress =
    directReports.length > 0
      ? Math.round(
          directReports.reduce((sum, r) => sum + r.metrics.avgRockProgress, 0) / directReports.length
        )
      : 0

  // EOD metrics
  const submittedToday = directReports.filter((r) => r.eodStatus.submittedToday).length
  const eodSubmissionRateToday =
    activeMembers > 0 ? Math.round((submittedToday / activeMembers) * 100) : 0

  const avgEodSubmissionRate =
    directReports.length > 0
      ? Math.round(
          directReports.reduce((sum, r) => sum + r.metrics.eodSubmissionRateLast30Days, 0) /
            directReports.length
        )
      : 0

  const avgEodStreak =
    directReports.length > 0
      ? Math.round(
          directReports.reduce((sum, r) => sum + r.metrics.eodStreakDays, 0) / directReports.length
        )
      : 0

  // Escalations
  const activeEscalations = directReports.filter((r) => r.eodStatus.needsEscalation).length
  const unaddressedBlockers = directReports.reduce(
    (sum, r) => sum + r.metrics.blockersMentioned,
    0
  )

  // Determine team sentiment (simplified - could be enhanced with AI)
  let teamSentiment: TeamSummary["teamSentiment"] = "neutral"
  if (totalOverdueTasks > totalPendingTasks * 0.3) {
    teamSentiment = "negative"
  } else if (avgTaskCompletionRate > 70 && avgRockProgress > 50) {
    teamSentiment = "positive"
  } else if (rocksBlocked > 0 || activeEscalations > 0) {
    teamSentiment = "mixed"
  }

  return {
    totalMembers: directReports.length,
    activeMembers,
    totalPendingTasks,
    totalOverdueTasks,
    avgTaskCompletionRate,
    tasksCompletedThisWeek,
    totalActiveRocks,
    rocksOnTrack,
    rocksAtRisk,
    rocksBlocked,
    avgRockProgress,
    eodSubmissionRateToday,
    eodSubmissionRate7Days: avgEodSubmissionRate,
    avgEodStreak,
    teamSentiment,
    activeEscalations,
    unaddressedBlockers,
  }
}

function generateAlerts(directReports: DirectReport[], today: Date): ManagerAlert[] {
  const alerts: ManagerAlert[] = []
  const todayStr = format(today, "yyyy-MM-dd")

  for (const report of directReports) {
    // Critical: Blocked rocks
    for (const rock of report.rocks.filter((r) => r.status === "blocked")) {
      alerts.push({
        id: `blocked-${rock.id}`,
        type: "blocked_rock",
        severity: "critical",
        title: `Blocked: ${rock.title}`,
        description: `${report.name}'s rock is blocked`,
        memberId: report.id,
        memberName: report.name,
        relatedItemId: rock.id,
        relatedItemType: "rock",
        createdAt: todayStr,
      })
    }

    // High: Overdue tasks
    if (report.metrics.overdueTasks > 0) {
      alerts.push({
        id: `overdue-${report.id}`,
        type: "overdue_task",
        severity: report.metrics.overdueTasks > 3 ? "critical" : "high",
        title: `${report.metrics.overdueTasks} overdue task${report.metrics.overdueTasks > 1 ? "s" : ""}`,
        description: `${report.name} has overdue tasks`,
        memberId: report.id,
        memberName: report.name,
        createdAt: todayStr,
      })
    }

    // High: Active escalation
    if (report.eodStatus.needsEscalation) {
      alerts.push({
        id: `escalation-${report.id}`,
        type: "escalation",
        severity: "high",
        title: "Escalation needed",
        description: report.eodStatus.escalationNote || `${report.name} flagged an escalation`,
        memberId: report.id,
        memberName: report.name,
        relatedItemType: "eod",
        createdAt: todayStr,
      })
    }

    // Medium: At-risk rocks
    for (const rock of report.rocks.filter((r) => r.status === "at-risk")) {
      alerts.push({
        id: `atrisk-${rock.id}`,
        type: "at_risk",
        severity: "medium",
        title: `At Risk: ${rock.title}`,
        description: `${rock.progress}% complete, deadline approaching`,
        memberId: report.id,
        memberName: report.name,
        relatedItemId: rock.id,
        relatedItemType: "rock",
        createdAt: todayStr,
      })
    }

    // Medium: Missed EOD (if after typical work hours)
    const isAfternoon = today.getHours() >= 17
    if (isAfternoon && !report.eodStatus.submittedToday && report.status === "active") {
      alerts.push({
        id: `missed-eod-${report.id}`,
        type: "missed_eod",
        severity: "medium",
        title: "EOD not submitted",
        description: `${report.name} hasn't submitted today's EOD`,
        memberId: report.id,
        memberName: report.name,
        createdAt: todayStr,
      })
    }

    // Low: Low engagement (no tasks completed this week)
    if (
      report.metrics.tasksCompletedThisWeek === 0 &&
      report.metrics.pendingTasks > 0 &&
      report.status === "active"
    ) {
      alerts.push({
        id: `low-engagement-${report.id}`,
        type: "low_engagement",
        severity: "low",
        title: "Low activity this week",
        description: `${report.name} has ${report.metrics.pendingTasks} pending tasks but no completions this week`,
        memberId: report.id,
        memberName: report.name,
        createdAt: todayStr,
      })
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}

function generateInsights(
  directReports: DirectReport[],
  teamSummary: TeamSummary
): ManagerInsight[] {
  const insights: ManagerInsight[] = []

  // Performance insight: High performer
  const highPerformers = directReports.filter(
    (r) => r.metrics.taskCompletionRate > 80 && r.metrics.eodSubmissionRateLast30Days > 80
  )
  if (highPerformers.length > 0) {
    insights.push({
      id: "high-performers",
      type: "performance",
      title: "High performers identified",
      description: `${highPerformers.map((p) => p.name).join(", ")} ${highPerformers.length === 1 ? "is" : "are"} showing excellent performance with ${highPerformers[0].metrics.taskCompletionRate}% task completion rate`,
      priority: "medium",
      actionable: false,
    })
  }

  // Workload insight: Imbalanced workload
  const avgPendingTasks =
    teamSummary.totalPendingTasks / Math.max(teamSummary.activeMembers, 1)
  const overloadedMembers = directReports.filter(
    (r) => r.metrics.pendingTasks > avgPendingTasks * 1.5
  )
  if (overloadedMembers.length > 0) {
    insights.push({
      id: "workload-imbalance",
      type: "workload",
      title: "Workload imbalance detected",
      description: `${overloadedMembers.map((m) => m.name).join(", ")} ${overloadedMembers.length === 1 ? "has" : "have"} significantly more tasks than the team average`,
      priority: "high",
      actionable: true,
      suggestedAction: "Consider redistributing tasks or providing support",
    })
  }

  // Pattern insight: EOD consistency
  const lowEodMembers = directReports.filter(
    (r) => r.metrics.eodSubmissionRateLast30Days < 50 && r.status === "active"
  )
  if (lowEodMembers.length > 0) {
    insights.push({
      id: "eod-consistency",
      type: "pattern",
      title: "EOD submission consistency",
      description: `${lowEodMembers.length} team member${lowEodMembers.length === 1 ? "" : "s"} ${lowEodMembers.length === 1 ? "has" : "have"} less than 50% EOD submission rate`,
      priority: "medium",
      actionable: true,
      suggestedAction: "Consider discussing the importance of daily updates",
    })
  }

  // Recommendation: Rock progress
  if (teamSummary.avgRockProgress < 30 && teamSummary.totalActiveRocks > 0) {
    insights.push({
      id: "rock-progress-low",
      type: "recommendation",
      title: "Quarterly rocks need attention",
      description: `Average rock progress is ${teamSummary.avgRockProgress}% - consider reviewing blockers and priorities`,
      priority: "high",
      actionable: true,
      suggestedAction: "Schedule a team sync to address rock progress",
    })
  }

  // Positive sentiment: Good week
  if (
    teamSummary.tasksCompletedThisWeek > teamSummary.totalPendingTasks &&
    teamSummary.eodSubmissionRateToday > 70
  ) {
    insights.push({
      id: "positive-week",
      type: "sentiment",
      title: "Strong team performance",
      description: `Team completed ${teamSummary.tasksCompletedThisWeek} tasks this week with ${teamSummary.eodSubmissionRateToday}% EOD submission today`,
      priority: "low",
      actionable: false,
    })
  }

  return insights
}
