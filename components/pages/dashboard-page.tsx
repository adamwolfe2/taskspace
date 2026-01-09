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
import { FocusOfTheDay } from "@/components/dashboard/focus-of-the-day"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateUserStats } from "@/lib/utils/stats-calculator"
import { triggerConfetti } from "@/lib/utils/confetti"
import { getTodayString } from "@/lib/utils/date-utils"
import { ProductivityWidget } from "@/components/productivity/productivity-dashboard"
import {
  useProductivityDashboard,
  useTodayEnergy,
} from "@/lib/hooks/use-productivity"

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
 const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
 const eodCardRef = useRef<HTMLDivElement>(null)

 // Productivity data
 const { data: productivityData, isLoading: productivityLoading } = useProductivityDashboard(currentUser.id)
 const { energy: todayEnergy } = useTodayEnergy(currentUser.id)

 // Calculate total focus minutes from weekly hours data
 const totalFocusMinutes = productivityData?.weeklyHours?.reduce(
   (sum, day) => sum + day.totalMinutes,
   0
 ) || 0

 const currentQuarter = getCurrentQuarter()
 const userRocks = rocks.filter((r) => r.userId === currentUser.id)
 // Filter to only current quarter rocks for EOD submission (less clutter)
 const currentQuarterRocks = userRocks.filter((r) => r.quarter === currentQuarter)
 const userTasks = assignedTasks.filter((t) => t.assigneeId === currentUser.id)
 const stats = calculateUserStats(currentUser.id, rocks, assignedTasks, eodReports)

 // Check if EOD submitted today (using local timezone to match API behavior)
 const today = getTodayString()
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

 const handleViewTask = (_taskId: string) => {
 // TODO: Open task detail modal
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
 <h1 className="text-2xl font-bold text-slate-900 ">
 Welcome back, {currentUser.name.split(" ")[0]}
 </h1>
 <p className="text-slate-500  mt-1">Here's your overview for today</p>
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

 {/* Productivity Widget */}
 {!productivityLoading && productivityData && (
   <ErrorBoundary title="Productivity metrics unavailable">
     <ProductivityWidget
       focusScore={productivityData.focusScore}
       streak={productivityData.streak}
       todayEnergy={todayEnergy || null}
       totalFocusMinutes={totalFocusMinutes}
     />
   </ErrorBoundary>
 )}

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
 {(currentUser.role === "admin" || currentUser.role === "owner") ? (
 /* Admins get tabs to switch between AI and Manual EOD submission */
 <Tabs defaultValue="ai" className="w-full">
 <TabsList className="grid w-full grid-cols-2 mb-4">
 <TabsTrigger value="ai" className="data-[state=active]:bg-purple-100">
 ✨ AI Text Dump
 </TabsTrigger>
 <TabsTrigger value="manual">
 Manual Entry
 </TabsTrigger>
 </TabsList>
 <TabsContent value="ai">
 <AIEODSubmission
 rocks={currentQuarterRocks}
 allRocks={rocks}
 onSubmitEOD={handleSubmitEOD}
 userId={currentUser.id}
 currentUser={currentUser}
 />
 </TabsContent>
 <TabsContent value="manual">
 <EODSubmissionCard
 rocks={currentQuarterRocks}
 allRocks={rocks}
 onSubmitEOD={handleSubmitEOD}
 userId={currentUser.id}
 currentUser={currentUser}
 assignedTasks={assignedTasks}
 selectedDate={selectedEodDate}
 onDateReset={() => setSelectedEodDate(null)}
 />
 </TabsContent>
 </Tabs>
 ) : (
 /* Regular members get the standard EOD card */
 <EODSubmissionCard
 rocks={currentQuarterRocks}
 allRocks={rocks}
 onSubmitEOD={handleSubmitEOD}
 userId={currentUser.id}
 currentUser={currentUser}
 assignedTasks={assignedTasks}
 selectedDate={selectedEodDate}
 onDateReset={() => setSelectedEodDate(null)}
 />
 )}
 </ErrorBoundary>
 </div>
 </div>
 )
}
