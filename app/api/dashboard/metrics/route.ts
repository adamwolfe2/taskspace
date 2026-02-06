import { NextRequest, NextResponse } from "next/server"
import { withAdmin } from "@/lib/api/middleware"
import { db } from "@/lib/db"
import { userHasWorkspaceAccess, getWorkspaceById } from "@/lib/db/workspaces"
import type { ApiResponse } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

interface DashboardMetrics {
  tasksCreated: number
  tasksCompleted: number
  rocksActive: number
  rocksCompleted: number
  eodSubmittedToday: number
  eodSubmittedThisWeek: number
  avgEodSubmissionRate: number
  topContributors: Array<{
    memberId: string
    name: string
    tasksCompleted: number
    eodStreak: number
  }>
  workspaceId?: string
  workspaceName?: string
}

/**
 * GET /api/dashboard/metrics
 * Get workspace dashboard metrics (admin only)
 *
 * Query params:
 * - workspaceId: Optional workspace ID to filter metrics
 */
export const GET = withAdmin(async (request: NextRequest, auth) => {
  try {
    const orgId = auth.organization.id

    // Get optional workspace filter
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    // If workspace filter provided, validate access
    let workspaceName: string | undefined
    if (workspaceId) {
      const workspace = await getWorkspaceById(workspaceId)
      if (!workspace || workspace.organizationId !== orgId) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "Workspace not found" },
          { status: 404 }
        )
      }

      const hasAccess = await userHasWorkspaceAccess(auth.user.id, workspaceId)
      if (!hasAccess) {
        return NextResponse.json<ApiResponse<null>>(
          { success: false, error: "No access to this workspace" },
          { status: 403 }
        )
      }
      workspaceName = workspace.name
    }

    // Get today's date in the organization's timezone (simplified - using UTC)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split("T")[0]

    // Get start of week (Sunday)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    // Current quarter for rocks
    const quarter = Math.floor((today.getMonth() + 3) / 3)
    const year = today.getFullYear()
    const currentQuarter = `Q${quarter} ${year}`

    // Fetch all needed data in parallel - pass workspaceId to filter at database layer
    const [tasks, rocks, eodReports, members] = await Promise.all([
      db.assignedTasks.findByOrganizationId(orgId, workspaceId || undefined),
      db.rocks.findByOrganizationId(orgId, workspaceId || undefined),
      db.eodReports.findByOrganizationId(orgId, workspaceId || undefined),
      db.members.findWithUsersByOrganizationId(orgId),
    ])

    // Calculate metrics
    const pendingTasks = tasks.filter(t => t.status !== "completed")
    const completedTasks = tasks.filter(t => t.status === "completed")

    const activeRocks = rocks.filter(r => r.quarter === currentQuarter && r.status !== "completed")
    const completedRocks = rocks.filter(r => r.quarter === currentQuarter && r.status === "completed")

    // EOD Reports - today and this week
    const todayReports = eodReports.filter(r => r.date === todayStr)
    const weekReports = eodReports.filter(r => {
      const reportDate = new Date(r.date)
      return reportDate >= startOfWeek && reportDate <= today
    })

    // Active members for submission rate
    const activeMembers = members.filter(m => m.status === "active")
    const avgEodSubmissionRate = activeMembers.length > 0
      ? Math.round((todayReports.length / activeMembers.length) * 100)
      : 0

    // Top contributors (simplified - just count completed tasks)
    const memberTaskCounts = new Map<string, number>()
    completedTasks.forEach(task => {
      const current = memberTaskCounts.get(task.assigneeId) || 0
      memberTaskCounts.set(task.assigneeId, current + 1)
    })

    const topContributors = Array.from(memberTaskCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([memberId, tasksCompleted]) => {
        const member = members.find(m => m.id === memberId)
        return {
          memberId,
          name: member?.name || "Unknown",
          tasksCompleted,
          eodStreak: 0, // Could be calculated from EOD reports
        }
      })

    const metrics: DashboardMetrics = {
      tasksCreated: pendingTasks.length,
      tasksCompleted: completedTasks.length,
      rocksActive: activeRocks.length,
      rocksCompleted: completedRocks.length,
      eodSubmittedToday: todayReports.length,
      eodSubmittedThisWeek: weekReports.length,
      avgEodSubmissionRate,
      topContributors,
      ...(workspaceId && { workspaceId, workspaceName }),
    }

    return NextResponse.json<ApiResponse<DashboardMetrics>>({
      success: true,
      data: metrics,
    })
  } catch (error) {
    logError(logger, "Dashboard metrics error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    )
  }
})
