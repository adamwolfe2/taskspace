"use client"

import { useState } from "react"
import type { TeamMember, Rock, EODReport, AssignedTask } from "@/lib/types"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { MyRocksSection } from "@/components/dashboard/my-rocks-section"
import { AssignedTasksSection } from "@/components/dashboard/assigned-tasks-section"
import { EODSubmissionCard } from "@/components/dashboard/eod-submission-card"
import { WeeklyEODCalendar } from "@/components/dashboard/weekly-eod-calendar"
import { calculateUserStats } from "@/lib/utils/stats-calculator"

interface DashboardPageProps {
  currentUser: TeamMember
  rocks: Rock[]
  eodReports: EODReport[]
  assignedTasks: AssignedTask[]
  updateRock: (id: string, updates: Partial<Rock>) => Promise<Rock>
  submitEODReport: (report: Partial<EODReport>) => Promise<EODReport>
  updateTask: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
}

export function DashboardPage({
  currentUser,
  rocks,
  eodReports,
  assignedTasks,
  updateRock,
  submitEODReport,
  updateTask,
}: DashboardPageProps) {
  const [selectedEodDate, setSelectedEodDate] = useState<string | null>(null)

  const userRocks = rocks.filter((r) => r.userId === currentUser.id)
  const userTasks = assignedTasks.filter((t) => t.assigneeId === currentUser.id)
  const stats = calculateUserStats(currentUser.id, rocks, assignedTasks, eodReports)

  const handleSelectEodDate = (date: string) => {
    setSelectedEodDate(date)
  }

  const handleToggleTask = async (taskId: string) => {
    const task = userTasks.find(t => t.id === taskId)
    if (!task) return
    try {
      await updateTask(taskId, {
        status: task.status === "completed" ? "pending" : "completed",
        completedAt: task.status === "completed" ? null : new Date().toISOString()
      })
    } catch (err) {
      console.error("Failed to toggle task:", err)
    }
  }

  const handleUpdateProgress = async (rockId: string, progress: number) => {
    try {
      await updateRock(rockId, { progress })
    } catch (err) {
      console.error("Failed to update rock progress:", err)
    }
  }

  const handleSubmitEOD = async (report: Omit<EODReport, "id" | "createdAt" | "organizationId">) => {
    try {
      await submitEODReport(report)
    } catch (err) {
      console.error("Failed to submit EOD report:", err)
      throw err
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {currentUser.name.split(" ")[0]}</h1>
        <p className="text-slate-500 mt-1">Here's your overview for today</p>
      </div>

      <StatsCards stats={stats} />

      <WeeklyEODCalendar
        eodReports={eodReports}
        userId={currentUser.id}
        selectedDate={selectedEodDate}
        onSelectDate={handleSelectEodDate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyRocksSection rocks={userRocks} onUpdateProgress={handleUpdateProgress} />
        <AssignedTasksSection tasks={userTasks} onToggleTask={handleToggleTask} />
      </div>

      <EODSubmissionCard
        rocks={userRocks}
        allRocks={rocks}
        onSubmitEOD={handleSubmitEOD}
        userId={currentUser.id}
        currentUser={currentUser}
        assignedTasks={assignedTasks}
        selectedDate={selectedEodDate}
        onDateReset={() => setSelectedEodDate(null)}
      />
    </div>
  )
}
