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
import { useToast } from "@/hooks/use-toast"
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
import { WelcomeCard } from "@/components/dashboard/welcome-card"
import { FocusTimer } from "@/components/shared/focus-timer"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import {
 CustomizableLayout,
 SimpleDashboardLayout,
 useDashboardLayout,
 DEFAULT_WIDGETS,
 DEFAULT_LAYOUT,
} from "@/components/dashboard/customizable-layout"
import type { DashboardWidget } from "@/components/dashboard/customizable-layout"

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
 const { isFeatureEnabled, enabledFeatures } = useWorkspaceFeatures()
 const { currentWorkspaceId } = useWorkspaces()
 const { toast } = useToast()

 // Feature toggles
 const hasTasksFeature = isFeatureEnabled("core.tasks")
 const hasRocksFeature = isFeatureEnabled("core.rocks")
 const hasEodFeature = isFeatureEnabled("core.eodReports")
 const hasFocusBlocksFeature = isFeatureEnabled("productivity.focusBlocks")
 const hasStreaksFeature = isFeatureEnabled("productivity.streakTracking")
 const hasAchievementsFeature = isFeatureEnabled("productivity.achievements")
 const hasWeeklyReviewsFeature = isFeatureEnabled("productivity.weeklyReviews")

 // Dashboard layout hook with workspace persistence
 const {
  widgets,
  layout,
  isEditing,
  setIsEditing,
  handleWidgetToggle,
  handleLayoutChange,
  handleSave,
  handleReset,
 } = useDashboardLayout(DEFAULT_WIDGETS, DEFAULT_LAYOUT, currentWorkspaceId, enabledFeatures)

 const currentQuarter = getCurrentQuarter()
 const effectiveUserId = currentUser.userId || currentUser.id
 const userRocks = rocks.filter((r) => r.userId === effectiveUserId)
 const currentQuarterRocks = userRocks.filter((r) => r.quarter === currentQuarter)
 const userTasks = assignedTasks.filter((t) => t.assigneeId === effectiveUserId)
 const stats = calculateUserStats(effectiveUserId, rocks, assignedTasks, eodReports)

 const orgTimezone = currentOrganization?.settings?.timezone || "America/Los_Angeles"
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
   if (!wasCompleted) {
    triggerConfetti("task_complete")
   }
  } catch {
   toast({
    title: "Error",
    description: "Failed to toggle task",
    variant: "destructive",
   })
  }
 }

 const handleViewTask = (_taskId: string) => {
   tasksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
 }

 const handleUpdateProgress = async (rockId: string, progress: number) => {
  try {
   await updateRock(rockId, { progress })
  } catch {
   toast({
    title: "Error",
    description: "Failed to update rock progress",
    variant: "destructive",
   })
  }
 }

 const handleSubmitEOD = async (report: Omit<EODReport, "id" | "createdAt" | "organizationId" | "date">) => {
  try {
   await submitEODReport(report)
  } catch (err) {
   toast({
    title: "Error",
    description: "Failed to submit EOD report",
    variant: "destructive",
   })
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
   toast({
    title: "Error",
    description: "Failed to create task",
    variant: "destructive",
   })
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
    toast({
     title: "Error",
     description: "Failed to save focus block",
     variant: "destructive",
    })
   }
  } catch {
   toast({
    title: "Error",
    description: "Failed to save focus block",
    variant: "destructive",
   })
  }
 }

 // Render a widget by type — maps widget IDs to existing dashboard sections
 const renderWidget = (widget: DashboardWidget) => {
  switch (widget.type) {
   case "welcome":
    return (
     <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4">
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
    )

   case "eod_status":
    return (
     <EODStatusBar
      hasSubmittedToday={hasSubmittedEODToday}
      onSubmitEOD={handleScrollToEOD}
     />
    )

   case "action_hub":
    return (
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
    )

   case "rocks":
    return (
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
    )

   case "tasks":
    return (
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
    )

   case "stats":
    return (
     <ErrorBoundary title="Stats unavailable">
      <StatsCards stats={stats} />
     </ErrorBoundary>
    )

   case "productivity":
    return (
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
    )

   case "eod_calendar":
    return (
     <ErrorBoundary title="Calendar unavailable">
      <WeeklyEODCalendar
       eodReports={eodReports}
       userId={effectiveUserId}
       selectedDate={selectedEodDate}
       onSelectDate={handleSelectEodDate}
       showMoodTrend
      />
     </ErrorBoundary>
    )

   case "eod_submission":
    return (
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
    )

   case "focus":
    return (
     <ErrorBoundary title="Focus timer unavailable">
      <FocusTimer
       tasks={userTasks}
       rocks={userRocks}
       onSessionComplete={handleFocusSessionComplete}
      />
     </ErrorBoundary>
    )

   case "activity":
    return <ActivityFeed />

   default:
    return null
  }
 }

 const hasAnyFeature = hasTasksFeature || hasRocksFeature || hasEodFeature || hasFocusBlocksFeature

 return (
  <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
   {/* Alerts & Dialogs — always outside grid */}
   <NoWorkspaceAlert />
   <KeyboardShortcutsDialog />

   {/* Welcome card for new users */}
   <WelcomeCard
    userName={currentUser.name || ""}
    orgName={currentOrganization?.name}
    hasRocks={userRocks.length > 0}
    hasTasks={userTasks.length > 0}
    hasEodReports={eodReports.some((r) => r.userId === effectiveUserId)}
   />

   {hasAnyFeature ? (
    <>
     {/* Desktop: Customizable grid layout */}
     <div className="hidden md:block">
      <CustomizableLayout
       widgets={widgets}
       layout={layout}
       onLayoutChange={handleLayoutChange}
       onWidgetToggle={handleWidgetToggle}
       onSave={handleSave}
       onReset={handleReset}
       isEditing={isEditing}
       setIsEditing={setIsEditing}
       renderWidget={renderWidget}
      />
     </div>

     {/* Mobile: Simple stacked layout */}
     <div className="md:hidden">
      <SimpleDashboardLayout
       widgets={widgets}
       renderWidget={renderWidget}
      />
     </div>
    </>
   ) : (
    /* Empty Dashboard State */
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
