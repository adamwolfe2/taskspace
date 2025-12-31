"use client"

import { useState, useRef } from "react"
import type { TeamMember, Rock, EODReport, AssignedTask } from "@/lib/types"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { MyRocksSection } from "@/components/dashboard/my-rocks-section"
import { AssignedTasksSection } from "@/components/dashboard/assigned-tasks-section"
import { EODSubmissionCard } from "@/components/dashboard/eod-submission-card"
import { WeeklyEODCalendar } from "@/components/dashboard/weekly-eod-calendar"
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar"
import { FocusOfTheDay } from "@/components/dashboard/focus-of-the-day"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog"
import { calculateUserStats } from "@/lib/utils/stats-calculator"
import { triggerConfetti } from "@/lib/utils/confetti"

interface DashboardPageProps {
  currentUser: TeamMember
  rocks: Rock[]
  eodReports: EODReport[]
  assignedTasks: AssignedTask[]
  updateRock: (id: string, updates: Partial<Rock>) => Promise<Rock>
  submitEODReport: (report: Partial<EODReport>) => Promise<EODReport>
  updateTask: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
  createTask: (task: Partial<AssignedTask>) => Promise<AssignedTask>
  deleteTask: (id: string) => Promise<void>
  onRefresh?: () => Promise<void>
}

export function DashboardPage({
  currentUser,
  rocks,
  eodReports,
  assignedTasks,
  updateRock,
  submitEODReport,
  updateTask,
  createTask,
  deleteTask,
  onRefresh,
}: DashboardPageProps) {
  const [selectedEodDate, setSelectedEodDate] = useState<string | null>(null)
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const eodCardRef = useRef<HTMLDivElement>(null)

  const userRocks = rocks.filter((r) => r.userId === currentUser.id)
  const userTasks = assignedTasks.filter((t) => t.assigneeId === currentUser.id)
  const stats = calculateUserStats(currentUser.id, rocks, assignedTasks, eodReports)

  // Check if EOD submitted today
  const today = new Date().toISOString().split("T")[0]
  const hasSubmittedEODToday = eodReports.some(
    (r) => r.userId === currentUser.id && r.date === today
  )

  const handleSelectEodDate = (date: string) => {
    setSelectedEodDate(date)
  }

  const handleScrollToEOD = () => {
    eodCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const handleToggleTask = async (taskId: string) => {
    const task = userTasks.find(t => t.id === taskId)
    if (!task) return
    try {
      const wasCompleted = task.status === "completed"
      await updateTask(taskId, {
        status: wasCompleted ? "pending" : "completed",
        completedAt: wasCompleted ? null : new Date().toISOString()
      })
      // Celebrate task completion
      if (!wasCompleted) {
        triggerConfetti("task_complete")
      }
    } catch (err) {
      console.error("Failed to toggle task:", err)
    }
  }

  const handleViewTask = (taskId: string) => {
    // Could open a task detail modal here
    console.log("View task:", taskId)
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

  const handleAddTask = async (taskData: {
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
    recurrence?: AssignedTask["recurrence"]
  }) => {
    try {
      await createTask({
        title: taskData.title,
        description: taskData.description,
        assigneeId: currentUser.id,
        rockId: taskData.rockId,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        recurrence: taskData.recurrence,
      })
    } catch (err) {
      console.error("Failed to create task:", err)
      throw err
    }
  }

  return (
    <div className="space-y-6">
      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome back, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here's your overview for today</p>
        </div>
        <QuickActionsBar
          onSubmitEOD={handleScrollToEOD}
          onAddTask={() => setShowAddTaskDialog(true)}
          hasSubmittedEOD={hasSubmittedEODToday}
        />
      </div>

      {/* Stats Cards */}
      <ErrorBoundary title="Stats unavailable">
        <StatsCards stats={stats} />
      </ErrorBoundary>

      {/* Weekly EOD Calendar with Hover Preview */}
      <ErrorBoundary title="Calendar unavailable">
        <WeeklyEODCalendar
          eodReports={eodReports}
          userId={currentUser.id}
          selectedDate={selectedEodDate}
          onSelectDate={handleSelectEodDate}
          showMoodTrend
        />
      </ErrorBoundary>

      {/* Focus of the Day - AI Suggested Priorities */}
      <ErrorBoundary title="Suggestions unavailable">
        <FocusOfTheDay
          tasks={userTasks}
          rocks={userRocks}
          onToggleTask={handleToggleTask}
          onViewTask={handleViewTask}
        />
      </ErrorBoundary>

      {/* Rocks and Tasks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorBoundary title="Rocks section unavailable">
          <MyRocksSection
            rocks={userRocks}
            onUpdateProgress={handleUpdateProgress}
            onUpdateRock={updateRock}
          />
        </ErrorBoundary>
        <ErrorBoundary title="Tasks section unavailable">
          <AssignedTasksSection
            tasks={userTasks}
            onToggleTask={handleToggleTask}
            onTasksUpdated={onRefresh}
            userRocks={userRocks}
            currentUser={currentUser}
            onAddTask={handleAddTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
          />
        </ErrorBoundary>
      </div>

      {/* EOD Submission Card */}
      <div ref={eodCardRef}>
        <ErrorBoundary title="EOD submission unavailable">
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
        </ErrorBoundary>
      </div>
    </div>
  )
}
