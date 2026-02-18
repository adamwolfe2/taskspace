"use client"

import { useState, useRef } from "react"
import type { TeamMember, Rock, EODReport, AssignedTask } from "@/lib/types"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { MyRocksSection } from "@/components/dashboard/my-rocks-section"
import { AssignedTasksSection } from "@/components/dashboard/assigned-tasks-section"
import { EODSubmissionCard } from "@/components/dashboard/eod-submission-card"
import { AIEODSubmission } from "@/components/dashboard/ai-eod-submission"
import { WeeklyEODCalendar } from "@/components/dashboard/weekly-eod-calendar"
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar"
import { ActionHub } from "@/components/dashboard/action-hub"
import { EODStatusBar } from "@/components/dashboard/eod-status-bar"
import { ProductivityBar } from "@/components/dashboard/productivity-bar"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateUserStats } from "@/lib/utils/stats-calculator"
import { triggerConfetti } from "@/lib/utils/confetti"
import { getTodayInTimezone } from "@/lib/utils/date-utils"
import { useApp } from "@/lib/contexts/app-context"
import { useWorkspaceFeatures } from "@/lib/hooks/use-workspace-features"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { FocusTimer } from "@/components/shared/focus-timer"
import { useWorkspaces } from "@/lib/hooks/use-workspace"

// Get current quarter string (e.g., "Q1 2026")
function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth() // 0-11
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
}

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
 const eodCardRef = useRef<HTMLDivElement>(null)
 const tasksRef = useRef<HTMLDivElement>(null)
 const rocksRef = useRef<HTMLDivElement>(null)
 const { currentOrganization } = useApp()
 const { isFeatureEnabled } = useWorkspaceFeatures()
 const { currentWorkspaceId } = useWorkspaces()
 // Check which features are enabled
 const hasTasksFeature = isFeatureEnabled("core.tasks")
 const hasRocksFeature = isFeatureEnabled("core.rocks")
 const hasEodFeature = isFeatureEnabled("core.eodReports")
 const hasFocusBlocksFeature = isFeatureEnabled("productivity.focusBlocks")
 const hasStreaksFeature = isFeatureEnabled("productivity.streakTracking")
 const hasAchievementsFeature = isFeatureEnabled("productivity.achievements")
 const hasWeeklyReviewsFeature = isFeatureEnabled("productivity.weeklyReviews")

 const currentQuarter = getCurrentQuarter()
 // Use users.id (not org_members.id) for filtering rocks/tasks/EODs
 const effectiveUserId = currentUser.userId || currentUser.id
 const userRocks = rocks.filter((r) => r.userId === effectiveUserId)
 // Filter to only current quarter rocks for EOD submission (less clutter)
 const currentQuarterRocks = userRocks.filter((r) => r.quarter === currentQuarter)
 const userTasks = assignedTasks.filter((t) => t.assigneeId === effectiveUserId)
 const stats = calculateUserStats(effectiveUserId, rocks, assignedTasks, eodReports)

 // Get organization timezone for date calculations
 const orgTimezone = currentOrganization?.settings?.timezone || "America/Los_Angeles"

 // Check if EOD submitted today (using organization timezone)
 const today = getTodayInTimezone(orgTimezone)
 const hasSubmittedEODToday = eodReports.some(
 (r) => r.userId === effectiveUserId && r.date === today
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

 const handleViewTask = (_taskId: string) => {
   // Scroll to tasks section where user can interact with the task
   tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
 }

 const handleUpdateProgress = async (rockId: string, progress: number) => {
 try {
 await updateRock(rockId, { progress })
 } catch (err) {
 console.error("Failed to update rock progress:", err)
 }
 }

 const handleSubmitEOD = async (report: Omit<EODReport, "id" | "createdAt" | "organizationId" | "date">) => {
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
 projectId: string | null
 projectName: string | null
 priority: "high" | "medium" | "normal"
 dueDate: string
 recurrence?: AssignedTask["recurrence"]
 }) => {
 try {
 await createTask({
 title: taskData.title,
 description: taskData.description,
 assigneeId: effectiveUserId,
 rockId: taskData.rockId,
 projectId: taskData.projectId,
 priority: taskData.priority,
 dueDate: taskData.dueDate,
 recurrence: taskData.recurrence,
 })
 } catch (err) {
 console.error("Failed to create task:", err)
 throw err
 }
 }

 const handleFocusSessionComplete = async (session: {
 taskId?: string
 rockId?: string
 durationMinutes: number
 sessionType: "pomodoro" | "custom" | "deep_work"
 }) => {
 try {
 const endTime = new Date().toISOString()
 const startTime = new Date(Date.now() - session.durationMinutes * 60 * 1000).toISOString()
 const response = await fetch("/api/productivity/focus-blocks", {
 method: "POST",
 headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
 body: JSON.stringify({
 startTime,
 endTime,
 category: "deep_work",
 workspaceId: currentWorkspaceId,
 taskId: session.taskId,
 rockId: session.rockId,
 }),
 })
 if (!response.ok) {
 console.error("Failed to save focus block:", await response.text())
 }
 } catch (err) {
 console.error("Failed to save focus block:", err)
 }
 }

 return (
 <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
 {/* 1. Alerts & Dialog */}
 <NoWorkspaceAlert />
 <KeyboardShortcutsDialog />

 {/* 2. Welcome Header + QuickActionsBar (no EOD button — moved to EODStatusBar) */}
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
 <div className="min-w-0">
 <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
 Welcome back, {(currentUser.name || "there").split(" ")[0]}
 </h1>
 <p className="text-sm sm:text-base text-slate-500 mt-1">Here&apos;s your overview for today</p>
 </div>
 {hasTasksFeature && (
 <QuickActionsBar
 onAddTask={() => tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
 />
 )}
 </div>

 {/* 3. EOD Status Bar — prominent CTA */}
 {hasEodFeature && (
 <EODStatusBar
 hasSubmittedToday={hasSubmittedEODToday}
 onSubmitEOD={handleScrollToEOD}
 />
 )}

 {/* 4. Action Hub — unified AI suggestions (replaces SmartSuggestions + FocusOfTheDay) */}
 {(hasTasksFeature || hasRocksFeature) && (
 <ErrorBoundary title="Suggestions unavailable">
 <ActionHub
 tasks={userTasks}
 rocks={userRocks}
 eodReports={eodReports}
 onToggleTask={handleToggleTask}
 onViewTask={handleViewTask}
 onTaskClick={() => {
 tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
 }}
 onRockClick={() => {
 rocksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
 }}
 />
 </ErrorBoundary>
 )}

 {/* 5. Rocks + Tasks Grid — PROMOTED (was position 10) */}
 {(hasRocksFeature || hasTasksFeature) && (
 <div className={`grid grid-cols-1 ${hasRocksFeature && hasTasksFeature ? 'lg:grid-cols-2' : ''} gap-4 sm:gap-6`}>
 {hasRocksFeature && (
 <div ref={rocksRef}>
 <ErrorBoundary title="Rocks section unavailable">
 <MyRocksSection
 rocks={userRocks}
 onUpdateProgress={handleUpdateProgress}
 onUpdateRock={updateRock}
 onRefresh={onRefresh}
 />
 </ErrorBoundary>
 </div>
 )}
 {hasTasksFeature && (
 <div ref={tasksRef}>
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
 )}
 </div>
 )}

 {/* 6. Stats + Productivity Group — DEMOTED, grouped together */}
 {(hasTasksFeature || hasRocksFeature || hasStreaksFeature || hasAchievementsFeature || hasWeeklyReviewsFeature) && (
 <div className="space-y-4 sm:space-y-6">
 {(hasTasksFeature || hasRocksFeature) && (
 <ErrorBoundary title="Stats unavailable">
 <StatsCards stats={stats} />
 </ErrorBoundary>
 )}

 {(hasStreaksFeature || hasAchievementsFeature || hasWeeklyReviewsFeature) && (
 <ErrorBoundary title="Productivity bar unavailable">
 <ProductivityBar
 userId={effectiveUserId}
 eodReports={eodReports}
 tasks={assignedTasks}
 rocks={rocks}
 showStreaks={hasStreaksFeature}
 showAchievements={hasAchievementsFeature}
 showWeeklyReview={hasWeeklyReviewsFeature}
 />
 </ErrorBoundary>
 )}
 </div>
 )}

 {/* 7. Weekly EOD Calendar + EOD Submission — side-by-side on desktop */}
 {hasEodFeature && (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
 <ErrorBoundary title="Calendar unavailable">
 <WeeklyEODCalendar
 eodReports={eodReports}
 userId={effectiveUserId}
 selectedDate={selectedEodDate}
 onSelectDate={handleSelectEodDate}
 showMoodTrend
 />
 </ErrorBoundary>

 <div ref={eodCardRef} data-eod-section>
 <ErrorBoundary title="EOD submission unavailable">
 <Tabs defaultValue="ai" className="w-full">
 <TabsList className="grid w-full grid-cols-2 mb-3 sm:mb-4">
 <TabsTrigger value="ai" className="text-xs sm:text-sm min-h-[44px]">
 ✨ AI Text Dump
 </TabsTrigger>
 <TabsTrigger value="manual" className="text-xs sm:text-sm min-h-[44px]">
 Manual Entry
 </TabsTrigger>
 </TabsList>
 <TabsContent value="ai">
 <AIEODSubmission
 rocks={currentQuarterRocks}
 allRocks={rocks}
 onSubmitEOD={handleSubmitEOD}
 userId={effectiveUserId}
 currentUser={currentUser}
 />
 </TabsContent>
 <TabsContent value="manual">
 <EODSubmissionCard
 rocks={currentQuarterRocks}
 allRocks={rocks}
 onSubmitEOD={handleSubmitEOD}
 userId={effectiveUserId}
 currentUser={currentUser}
 assignedTasks={assignedTasks}
 selectedDate={selectedEodDate}
 onDateReset={() => setSelectedEodDate(null)}
 />
 </TabsContent>
 </Tabs>
 </ErrorBoundary>
 </div>
 </div>
 )}

 {/* 8. Focus Timer — demoted */}
 {hasFocusBlocksFeature && (
 <ErrorBoundary title="Focus timer unavailable">
 <FocusTimer
 tasks={userTasks}
 rocks={userRocks}
 onSessionComplete={handleFocusSessionComplete}
 />
 </ErrorBoundary>
 )}

 {/* 9. Recent Activity Feed */}
 <ActivityFeed />

 {/* 10. Empty Dashboard State */}
 {!hasTasksFeature && !hasRocksFeature && !hasEodFeature && !hasFocusBlocksFeature && (
 <Card>
 <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16 px-4">
 <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
 <h3 className="text-base sm:text-lg font-semibold mb-2">Dashboard Empty</h3>
 <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-md">
 No dashboard widgets are available. Contact your workspace admin to enable features.
 </p>
 </CardContent>
 </Card>
 )}
 </div>
 )
}
