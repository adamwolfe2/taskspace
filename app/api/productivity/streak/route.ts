import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { isAdmin } from "@/lib/auth/middleware"
import { withAuth } from "@/lib/api/middleware"
import { userHasWorkspaceAccess } from "@/lib/db/workspaces"

import type { ApiResponse, UserStreak } from "@/lib/types"
import { logger, logError } from "@/lib/logger"

// GET /api/productivity/streak - Get user's streak data
export const GET = withAuth(async (request, auth) => {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const userId = searchParams.get("userId") || auth.user.id

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

    // Fetch EOD reports for streak calculation
    const allReports = await db.eodReports.findByUserId(userId, auth.organization.id)

    // Filter by workspace - EOD reports already have workspace_id!
    const reports = allReports.filter(r => r.workspaceId === workspaceId)

    // Sort reports by date descending
    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Calculate current streak
    let currentStreak = 0
    const today = new Date()
    const checkDate = new Date(today)
    let lastSubmissionDate: string | null = null

    if (sortedReports.length > 0) {
      lastSubmissionDate = sortedReports[0].date
    }

    // Count consecutive weekdays with reports
    for (let i = 0; i < 365; i++) {
      const day = checkDate.getDay()
      // Skip weekends
      if (day === 0 || day === 6) {
        checkDate.setDate(checkDate.getDate() - 1)
        continue
      }

      const dateStr = checkDate.toISOString().split("T")[0]
      const hasReport = sortedReports.some((r) => r.date === dateStr)

      if (hasReport) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (dateStr === today.toISOString().split("T")[0]) {
        // If today and no report yet, don't break streak
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Calculate longest streak
    let longestStreak = 0
    let tempStreak = 0
    const reportDates = new Set(sortedReports.map((r) => r.date))

    // Go through all reports to find longest streak
    const allDates = sortedReports.map((r) => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime())

    if (allDates.length > 0) {
      const firstDate = allDates[0]
      const lastDate = allDates[allDates.length - 1]
      const scanDate = new Date(firstDate)

      while (scanDate <= lastDate) {
        const day = scanDate.getDay()
        // Skip weekends
        if (day === 0 || day === 6) {
          scanDate.setDate(scanDate.getDate() + 1)
          continue
        }

        const dateStr = scanDate.toISOString().split("T")[0]

        if (reportDates.has(dateStr)) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 0
        }

        scanDate.setDate(scanDate.getDate() + 1)
      }
    }

    // Ensure current streak counts toward longest
    longestStreak = Math.max(longestStreak, currentStreak)

    // Calculate milestone dates (when milestones were achieved)
    const milestoneDates: UserStreak["milestoneDates"] = {}
    const milestones = [7, 14, 30, 60, 90, 100] as const

    for (const milestone of milestones) {
      if (longestStreak >= milestone) {
        // Find the date when this milestone was achieved
        // This is a simplified calculation - in production, you'd track this in the DB
        const estimatedDate = new Date()
        estimatedDate.setDate(estimatedDate.getDate() - (longestStreak - milestone))
        milestoneDates[milestone.toString() as keyof UserStreak["milestoneDates"]] =
          estimatedDate.toISOString().split("T")[0]
      }
    }

    const streakData: UserStreak = {
      id: `${auth.organization.id}-${userId}-${workspaceId}`,
      organizationId: auth.organization.id,
      userId,
      workspaceId,
      currentStreak,
      longestStreak,
      lastSubmissionDate,
      milestoneDates,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<UserStreak>>({
      success: true,
      data: streakData,
    })
  } catch (error) {
    logError(logger, "Get streak error", error)
    return NextResponse.json<ApiResponse<null>>(
      { success: false, error: "Failed to get streak data" },
      { status: 500 }
    )
  }
})
