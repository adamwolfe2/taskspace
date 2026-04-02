import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/api/middleware"
import type { RouteContext } from "@/lib/api/middleware"
import { checkCreditsOrRespond, recordUsage } from "@/lib/ai/credits"
import { generateQuarterlyMemberSummary } from "@/lib/ai/claude-client"
import {
  getQuarterlyReport,
  updateQuarterlyReportData,
  getMemberPeriodStats,
  getMemberRocks,
  getMemberRecentTaskTitles,
} from "@/lib/db/quarterly-reports"
import type { ApiResponse, QuarterlyReport, QuarterlyReportData, QuarterlyMemberReport } from "@/lib/types"
import { logger, logError } from "@/lib/logger"
import { checkApiRateLimit, getRateLimitHeaders } from "@/lib/auth/rate-limit"

// POST /api/quarterly-reports/[id]/generate
export const POST = withAuth(async (request: NextRequest, auth, context?: RouteContext) => {
  let reportId: string | undefined

  try {
    const params = await context!.params
    reportId = params.id

    // Rate limit: 2 generations per minute (expensive operation)
    const rateLimit = await checkApiRateLimit(request, `quarterly-gen:${auth.user.id}`, 2, 60_000)
    if (!rateLimit.success) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Too many requests. Please wait a moment." },
        { status: 429, headers: getRateLimitHeaders(rateLimit, 2) }
      )
    }

    const report = await getQuarterlyReport(reportId, auth.organization.id)
    if (!report) {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report not found" },
        { status: 404 }
      )
    }

    if (report.status === "generating") {
      return NextResponse.json<ApiResponse<null>>(
        { success: false, error: "Report is already being generated" },
        { status: 409 }
      )
    }

    // Credit check
    const creditCheck = await checkCreditsOrRespond({
      organizationId: auth.organization.id,
      userId: auth.user.id,
    })
    if (creditCheck instanceof NextResponse) return creditCheck as NextResponse<ApiResponse<null>>

    // Mark as generating
    await updateQuarterlyReportData(reportId, auth.organization.id, { status: "generating" })

    const { periodStart, periodEnd, quarter } = report

    // Gather data in parallel
    const [memberStats, memberRocks, memberTasks] = await Promise.all([
      getMemberPeriodStats(auth.organization.id, report.workspaceId, periodStart, periodEnd),
      getMemberRocks(auth.organization.id, report.workspaceId, periodStart, periodEnd),
      getMemberRecentTaskTitles(auth.organization.id, report.workspaceId, periodStart, periodEnd),
    ])

    // Build lookup maps
    const rocksByUser = memberRocks.reduce((acc, rock) => {
      if (!acc[rock.userId]) acc[rock.userId] = []
      acc[rock.userId].push(rock)
      return acc
    }, {} as Record<string, typeof memberRocks>)

    const tasksByUser = memberTasks.reduce((acc, m) => {
      acc[m.userId] = m.tasks
      return acc
    }, {} as Record<string, string[]>)

    // Calculate working days in quarter (approximate business days)
    const startDate = new Date(periodStart)
    const endDate = new Date(periodEnd)
    let workingDays = 0
    const d = new Date(startDate)
    while (d <= endDate) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) workingDays++
      d.setDate(d.getDate() + 1)
    }

    let totalInputTokens = 0
    let totalOutputTokens = 0

    const members: QuarterlyMemberReport[] = await Promise.all(
      memberStats.map(async (member) => {
        const rocks = rocksByUser[member.userId] || []
        const recentTasks = tasksByUser[member.userId] || []
        const rocksCompleted = rocks.filter(r => r.status === "completed").length
        const submissionRate = workingDays > 0
          ? Math.round((member.eodCount / workingDays) * 100)
          : 0

        let aiSummary: QuarterlyMemberReport["aiSummary"] | undefined

        if (member.userId && member.eodCount > 0) {
          try {
            const { result, usage } = await generateQuarterlyMemberSummary({
              memberName: member.name,
              quarter,
              periodStart,
              periodEnd,
              eodCount: member.eodCount,
              totalTasks: member.totalTasks,
              escalationCount: member.escalationCount,
              workedDays: member.workedDays,
              submissionRate,
              rocksAssigned: rocks.length,
              rocksCompleted,
              recentTasks,
            })
            aiSummary = result
            totalInputTokens += usage.inputTokens
            totalOutputTokens += usage.outputTokens
          } catch (err) {
            logger.warn({ memberId: member.memberId, err }, "Failed to generate AI summary for member")
          }
        }

        return {
          userId: member.userId,
          memberId: member.memberId,
          name: member.name || "Team Member",
          role: member.role,
          department: member.department,
          jobTitle: member.jobTitle,
          stats: {
            eodReportsSubmitted: member.eodCount,
            totalTasksCompleted: member.totalTasks,
            totalEscalations: member.escalationCount,
            rocksAssigned: rocks.length,
            rocksCompleted,
            rockCompletionRate: rocks.length > 0 ? Math.round((rocksCompleted / rocks.length) * 100) : 0,
            avgDailyTasks: member.workedDays > 0 ? Math.round((member.totalTasks / member.workedDays) * 10) / 10 : 0,
            submissionRate,
          },
          rocks: rocks.map(r => ({
            id: r.id,
            title: r.title,
            status: r.status,
            progress: r.progress,
            quarter: r.quarter,
          })),
          recentTasks: recentTasks.slice(0, 10),
          aiSummary,
        }
      })
    )

    // Aggregate team-level stats
    const totalEodReports = members.reduce((s, m) => s + m.stats.eodReportsSubmitted, 0)
    const totalTasksCompleted = members.reduce((s, m) => s + m.stats.totalTasksCompleted, 0)
    const totalRocks = members.reduce((s, m) => s + m.stats.rocksAssigned, 0)
    const completedRocks = members.reduce((s, m) => s + m.stats.rocksCompleted, 0)
    const totalEscalations = members.reduce((s, m) => s + m.stats.totalEscalations, 0)
    const avgSubmissionRate = members.length > 0
      ? Math.round(members.reduce((s, m) => s + m.stats.submissionRate, 0) / members.length)
      : 0

    const data: QuarterlyReportData = {
      summary: `${quarter} report covering ${members.length} team members from ${periodStart} to ${periodEnd}.`,
      period: { quarter, start: periodStart, end: periodEnd },
      teamStats: {
        totalMembers: members.length,
        totalEodReports,
        avgSubmissionRate,
        totalTasksCompleted,
        totalRocks,
        completedRocks,
        rockCompletionRate: totalRocks > 0 ? Math.round((completedRocks / totalRocks) * 100) : 0,
        totalEscalations,
      },
      members,
      generatedAt: new Date().toISOString(),
    }

    const updated = await updateQuarterlyReportData(reportId, auth.organization.id, {
      data,
      status: "draft",
    })

    if (totalInputTokens > 0) {
      await recordUsage({
        organizationId: auth.organization.id,
        userId: auth.user.id,
        action: "quarterly-report",
        model: "claude-haiku-4-5-20251001",
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      })
    }

    return NextResponse.json<ApiResponse<QuarterlyReport>>({
      success: true,
      data: updated || report,
    })
  } catch (error) {
    logError(logger, "Generate quarterly report error", error)
    if (reportId) {
      try {
        await updateQuarterlyReportData(reportId, auth.organization.id, { status: "draft" })
      } catch {
        // ignore cleanup error
      }
    }
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to generate quarterly report" },
      { status: 500 }
    )
  }
})
