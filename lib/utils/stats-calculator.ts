import type { Rock, AssignedTask, EODReport } from "../types"

export function calculateUserStats(userId: string, rocks: Rock[], tasks: AssignedTask[], eodReports: EODReport[]) {
  const userRocks = rocks.filter((r) => r.userId === userId)
  const userTasks = tasks.filter((t) => t.assigneeId === userId)
  const userEODReports = eodReports.filter((e) => e.userId === userId)

  const completedTasks = userTasks.filter((t) => t.status === "completed").length
  const totalTasks = userTasks.length
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const averageRockProgress =
    userRocks.length > 0 ? Math.round(userRocks.reduce((sum, rock) => sum + rock.progress, 0) / userRocks.length) : 0

  const rocksOnTrack = userRocks.filter((r) => r.status === "on-track").length
  const rocksAtRisk = userRocks.filter((r) => r.status === "at-risk").length
  const rocksBlocked = userRocks.filter((r) => r.status === "blocked").length

  const last7DaysReports = userEODReports.filter((report) => {
    const reportDate = new Date(report.date)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return reportDate >= sevenDaysAgo
  }).length

  return {
    completedTasks,
    totalTasks,
    taskCompletionRate,
    activeRocks: userRocks.length,
    averageRockProgress,
    rocksOnTrack,
    rocksAtRisk,
    rocksBlocked,
    eodStreak: last7DaysReports,
  }
}
