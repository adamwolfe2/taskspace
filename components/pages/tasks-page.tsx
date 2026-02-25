"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { ExportButton } from "@/components/shared/export-button"
import { useState, useMemo, useEffect } from "react"
import type { AssignedTask, Rock, TeamMember, Project } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskCard } from "@/components/tasks/task-card"
import { AddTaskModal } from "@/components/tasks/add-task-modal"
import { KanbanBoard } from "@/components/tasks/kanban-board"
import { Plus, ClipboardList, UserCheck, Search, LayoutList, LayoutGrid, ArrowLeft, Eye, Sparkles, Loader2, CheckSquare, X, Trash2, AlertTriangle, Flag, ArrowUpDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { isPast, startOfDay } from "date-fns"
import { EmptyState } from "@/components/shared/empty-state"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useToast } from "@/hooks/use-toast"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { addDays, addWeeks, addMonths } from "date-fns"
import { getErrorMessage } from "@/lib/utils"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"
import { Checkbox } from "@/components/ui/checkbox"

interface TasksPageProps {
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  setAssignedTasks: (tasks: AssignedTask[]) => void
  rocks: Rock[]
  projects: Project[]
  createTask: (task: Partial<AssignedTask>) => Promise<AssignedTask>
  updateTask: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
  deleteTask: (id: string) => Promise<void>
  initialAssigneeFilter?: string // Pre-set assignee filter (e.g., from manager drill-down, uses org member id)
  filterUserName?: string        // Display name for the filtered user
  onFilterConsumed?: () => void  // Callback to clear the filter after consuming it
  onClearFilter?: () => void     // Callback to navigate back (clear the filter view)
}

export function TasksPage({
  currentUser,
  assignedTasks,
  setAssignedTasks: _setAssignedTasks,
  rocks,
  projects,
  createTask,
  updateTask,
  deleteTask,
  initialAssigneeFilter,
  filterUserName,
  onFilterConsumed,
  onClearFilter,
}: TasksPageProps) {
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<AssignedTask | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list")
  const [viewingUserId, setViewingUserId] = useState<string | null>(initialAssigneeFilter || null)
  const [viewingUserName, setViewingUserName] = useState<string | null>(filterUserName || null)
  const [aiPrioritizing, setAiPrioritizing] = useState(false)
  const [aiPrioritized, setAiPrioritized] = useState<Array<{ taskId: string; rank: number; reasoning: string }> | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [sortBy, setSortBy] = useState<"default" | "due-date" | "priority" | "title">("default")
  const { toast } = useToast()
  const { currentWorkspaceId } = useWorkspaceStore()

  const handleAiPrioritize = async () => {
    if (!currentWorkspaceId) return
    setAiPrioritizing(true)
    try {
      const pendingTasks = userTasks.filter((t) => t.status !== "completed")
      const response = await fetch("/api/ai/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({
          workspaceId: currentWorkspaceId,
          tasks: pendingTasks.map((t) => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate,
            assigneeName: t.assigneeName,
            rockTitle: t.rockTitle,
          })),
          rocks: rocks.map((r) => ({ title: r.title, progress: r.progress, status: r.status })),
        }),
      })
      const result = await response.json()
      if (result.success) {
        setAiPrioritized(result.data.prioritizedTasks)
        toast({ title: "Tasks Prioritized", description: result.data.summary })
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to prioritize tasks", variant: "destructive" })
    } finally {
      setAiPrioritizing(false)
    }
  }

  // Clear AI prioritization when filters change (ranking no longer applies)
  useEffect(() => {
    setAiPrioritized(null)
  }, [searchQuery, priorityFilter])

  // Apply initial filter from navigation (e.g., manager dashboard drill-down)
  useEffect(() => {
    if (initialAssigneeFilter) {
      setViewingUserId(initialAssigneeFilter)
      setViewingUserName(filterUserName || null)
      onFilterConsumed?.()
    }
  }, [initialAssigneeFilter, filterUserName, onFilterConsumed])

  // Use users.id (not org_members.id) for filtering rocks/tasks/EODs
  const effectiveUserId = currentUser.userId || currentUser.id
  // viewingUserId is users.id; compare against both currentUser.id (org_members.id)
  // and currentUser.userId (users.id) to handle the self-view case
  const isViewingOtherUser = viewingUserId !== null
    && viewingUserId !== currentUser.id
    && viewingUserId !== currentUser.userId
  const targetUserId = viewingUserId || effectiveUserId
  const userTasks = assignedTasks.filter((t) => t.assigneeId === targetUserId)

  const filteredTasks = useMemo(() => {
    const PRIORITY_ORDER = { high: 0, medium: 1, normal: 2, low: 3 }
    const filtered = userTasks.filter((task) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = task.title.toLowerCase().includes(query)
        const matchesDescription = task.description?.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDescription) return false
      }
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false
      if (overdueOnly && task.status !== "completed") {
        if (!task.dueDate) return false
        const due = startOfDay(new Date(task.dueDate))
        const today = startOfDay(new Date())
        if (!isPast(due) || due.getTime() === today.getTime()) return false
      }
      return true
    })
    if (sortBy === "due-date") {
      return [...filtered].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0
        if (!a.dueDate) return 1
        if (!b.dueDate) return -1
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      })
    }
    if (sortBy === "priority") {
      return [...filtered].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3))
    }
    if (sortBy === "title") {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title))
    }
    return filtered
  }, [userTasks, searchQuery, priorityFilter, overdueOnly, sortBy])

  const overdueCount = useMemo(() => {
    return userTasks.filter((t) => {
      if (t.status === "completed" || !t.dueDate) return false
      const due = startOfDay(new Date(t.dueDate))
      const today = startOfDay(new Date())
      return isPast(due) && due.getTime() !== today.getTime()
    }).length
  }, [userTasks])

  const assignedByAdmin = filteredTasks.filter((t) => t.type === "assigned" && t.status !== "completed")
  const personalTasksUnsorted = filteredTasks.filter((t) => t.type === "personal" && t.status !== "completed")
  const personalTasks = aiPrioritized
    ? [...personalTasksUnsorted].sort((a, b) => {
        const rankA = aiPrioritized.find((p) => p.taskId === a.id)?.rank ?? 999
        const rankB = aiPrioritized.find((p) => p.taskId === b.id)?.rank ?? 999
        return rankA - rankB
      })
    : personalTasksUnsorted
  const completedTasks = filteredTasks.filter((t) => t.status === "completed")

  const userRocks = rocks.filter((r) => r.userId === effectiveUserId)

  const calculateNextDueDate = (currentDueDate: string, recurrence: NonNullable<AssignedTask["recurrence"]>): Date => {
    const current = new Date(currentDueDate)
    switch (recurrence.type) {
      case "daily":
        return addDays(current, recurrence.interval)
      case "weekly":
        return addWeeks(current, recurrence.interval)
      case "monthly":
        return addMonths(current, recurrence.interval)
      default:
        return addDays(current, 1)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const completedTask = userTasks.find((t) => t.id === taskId)
      if (!completedTask) return

      await updateTask(taskId, {
        status: "completed",
        completedAt: new Date().toISOString(),
      })

      // If this is a recurring task, create the next instance
      if (completedTask?.recurrence && completedTask.dueDate) {
        const nextDueDate = calculateNextDueDate(completedTask.dueDate, completedTask.recurrence)

        // Check if we've passed the end date
        if (!completedTask.recurrence.endDate || nextDueDate <= new Date(completedTask.recurrence.endDate)) {
          await createTask({
            title: completedTask.title,
            description: completedTask.description,
            assigneeId: completedTask.assigneeId,
            rockId: completedTask.rockId,
            priority: completedTask.priority,
            dueDate: nextDueDate.toISOString().split("T")[0],
            recurrence: completedTask.recurrence,
            parentRecurringTaskId: completedTask.parentRecurringTaskId || completedTask.id,
          })

          toast({
            title: "Task completed!",
            description: `Added to today's EOD report. Next occurrence created for ${nextDueDate.toLocaleDateString()}`,
          })
          return
        }
      }

      toast({
        title: "Task completed!",
        description: "Added to today's EOD report",
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to complete task"),
        variant: "destructive",
      })
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
      if (editingTask) {
        await updateTask(editingTask.id, {
          title: taskData.title,
          description: taskData.description,
          rockId: taskData.rockId,
          projectId: taskData.projectId,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          recurrence: taskData.recurrence,
        })
        setEditingTask(null)
        toast({ title: "Task updated", description: "Your changes have been saved" })
      } else {
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
        toast({
          title: "Task created",
          description: taskData.recurrence
            ? `Recurring task created (${taskData.recurrence.type})`
            : "Your personal task has been added",
        })
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, editingTask ? "Failed to update task" : "Failed to create task"),
        variant: "destructive",
      })
    }
  }

  const handleEditTask = (task: AssignedTask) => {
    setEditingTask(task)
    setShowAddTaskModal(true)
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId)
      toast({
        title: "Task deleted",
        description: "Your task has been removed",
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to delete task"),
        variant: "destructive",
      })
    }
  }

  const handleToggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const handleSelectAll = (tasks: AssignedTask[]) => {
    const taskIds = tasks.map((t) => t.id)
    setSelectedTasks(new Set(taskIds))
  }

  const handleClearSelection = () => {
    setSelectedTasks(new Set())
  }

  const handleBulkComplete = async () => {
    const tasksToComplete = Array.from(selectedTasks)
    let successCount = 0
    let errorCount = 0

    setIsBulkProcessing(true)
    try {
      for (const taskId of tasksToComplete) {
        try {
          const task = userTasks.find((t) => t.id === taskId)
          if (task && task.status !== "completed") {
            await updateTask(taskId, {
              status: "completed",
              completedAt: new Date().toISOString(),
            })
            successCount++

            // Handle recurring tasks
            if (task.recurrence && task.dueDate) {
              const nextDueDate = calculateNextDueDate(task.dueDate, task.recurrence)
              if (!task.recurrence.endDate || nextDueDate <= new Date(task.recurrence.endDate)) {
                await createTask({
                  title: task.title,
                  description: task.description,
                  assigneeId: task.assigneeId,
                  rockId: task.rockId,
                  priority: task.priority,
                  dueDate: nextDueDate.toISOString().split("T")[0],
                  recurrence: task.recurrence,
                  parentRecurringTaskId: task.parentRecurringTaskId || task.id,
                })
              }
            }
          }
        } catch {
          errorCount++
        }
      }

      setSelectedTasks(new Set())

      if (successCount > 0) {
        toast({
          title: "Tasks completed",
          description: `${successCount} task${successCount > 1 ? "s" : ""} marked as complete`,
        })
      }
      if (errorCount > 0) {
        toast({
          title: "Some tasks failed",
          description: `${errorCount} task${errorCount > 1 ? "s" : ""} could not be completed`,
          variant: "destructive",
        })
      }
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkPriority = async (priority: "high" | "normal" | "low") => {
    const taskIds = Array.from(selectedTasks)
    setIsBulkProcessing(true)
    try {
      await Promise.all(taskIds.map((id) => updateTask(id, { priority })))
      setSelectedTasks(new Set())
      toast({ title: "Priority updated", description: `${taskIds.length} task${taskIds.length > 1 ? "s" : ""} set to ${priority}` })
    } catch {
      toast({ title: "Error", description: "Some tasks could not be updated", variant: "destructive" })
    } finally {
      setIsBulkProcessing(false)
    }
  }

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true)
  }

  const confirmBulkDelete = async () => {
    const tasksToDelete = Array.from(selectedTasks)
    let successCount = 0
    let errorCount = 0

    setIsBulkProcessing(true)
    try {
      for (const taskId of tasksToDelete) {
        try {
          await deleteTask(taskId)
          successCount++
        } catch {
          errorCount++
        }
      }

      setSelectedTasks(new Set())

      if (successCount > 0) {
        toast({
          title: "Tasks deleted",
          description: `${successCount} task${successCount > 1 ? "s" : ""} removed`,
        })
      }
      if (errorCount > 0) {
        toast({
          title: "Some tasks failed",
          description: `${errorCount} task${errorCount > 1 ? "s" : ""} could not be deleted`,
          variant: "destructive",
        })
      }
    } finally {
      setIsBulkProcessing(false)
      setShowBulkDeleteConfirm(false)
    }
  }

  const handleKanbanStatusChange = async (taskId: string, newStatus: AssignedTask["status"]) => {
    if (newStatus === "completed") {
      // Delegate to handleCompleteTask so recurring task logic fires correctly
      await handleCompleteTask(taskId)
      return
    }
    try {
      await updateTask(taskId, { status: newStatus })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to update task status"),
        variant: "destructive",
      })
    }
  }

  return (
    <FeatureGate feature="core.tasks">
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      <NoWorkspaceAlert />
      {/* Viewing other user's tasks banner */}
      {isViewingOtherUser && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <Eye className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">
              Viewing {viewingUserName ? `${viewingUserName}'s` : "team member's"} tasks
            </p>
            <p className="text-xs text-blue-600">Read-only view from manager dashboard</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setViewingUserId(null)
              setViewingUserName(null)
              onClearFilter?.()
            }}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to My Tasks
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">
            {isViewingOtherUser && viewingUserName ? `${viewingUserName}'s Tasks` : "Tasks"}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            {isViewingOtherUser ? "Viewing assigned tasks and progress" : "Manage your daily tasks and to-dos"}
          </p>
        </div>
        {!isViewingOtherUser && (
          <div className="flex gap-2 w-full sm:w-auto">
            <ExportButton type="tasks" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAiPrioritize}
              disabled={aiPrioritizing || userTasks.filter((t) => t.status !== "completed").length === 0}
              className="min-h-[44px]"
            >
              {aiPrioritizing ? <Loader2 className="h-4 w-4 animate-spin sm:mr-2" /> : <Sparkles className="h-4 w-4 sm:mr-2" />}
              <span className="hidden sm:inline">AI Prioritize</span>
            </Button>
            <Button onClick={() => setShowAddTaskModal(true)} className="flex-1 sm:flex-initial min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          </div>
        )}
      </div>

      {/* Search, Filters, and View Toggle */}
      <div className="bg-white rounded-xl shadow-card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 w-full"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-36 bg-slate-50 border-slate-200 flex-shrink-0">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
          {overdueCount > 0 && (
            <Button
              variant={overdueOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setOverdueOnly(!overdueOnly)}
              className={`flex-shrink-0 gap-1.5 min-h-[44px] ${overdueOnly ? "bg-red-600 hover:bg-red-700 border-red-600" : "border-red-200 text-red-600 hover:bg-red-50"}`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Overdue</span>
              <span className={`text-xs font-bold ${overdueOnly ? "text-white" : "text-red-600"}`}>({overdueCount})</span>
            </Button>
          )}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-full sm:w-36 bg-slate-50 border-slate-200 flex-shrink-0 min-h-[44px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Order</SelectItem>
              <SelectItem value="due-date">Due Date</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="title">Title A–Z</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(value) => value && setViewMode(value as "list" | "kanban")}
            className="flex-shrink-0"
            variant="outline"
          >
            <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-3 bg-white">
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">List</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="kanban" aria-label="Kanban view" className="gap-1.5 px-3 bg-white">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Kanban</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" ? (
        <div className="space-y-4 w-full">
          <KanbanBoard
            tasks={filteredTasks}
            onTaskStatusChange={handleKanbanStatusChange}
            onTaskClick={(task) => handleEditTask(task)}
          />
        </div>
      ) : (
      /* List View */
      <Tabs defaultValue="active" className="space-y-4 w-full overflow-hidden">
        <TabsList className="w-full sm:w-auto flex-wrap">
          <TabsTrigger value="active" className="flex-1 sm:flex-initial">
            My Tasks ({assignedByAdmin.length + personalTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 sm:flex-initial">
            Completed ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 sm:space-y-6 w-full overflow-hidden">
          {assignedByAdmin.length > 0 && (
            <Card className="w-full overflow-hidden">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <UserCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <span className="truncate">Assigned by Admin</span>
                    </CardTitle>
                    <CardDescription className="text-sm">Priority tasks assigned to you</CardDescription>
                  </div>
                  {!isViewingOtherUser && assignedByAdmin.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={assignedByAdmin.every((t) => selectedTasks.has(t.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleSelectAll(assignedByAdmin)
                          } else {
                            handleClearSelection()
                          }
                        }}
                        aria-label="Select all assigned tasks"
                      />
                      <span className="text-sm text-muted-foreground">Select All</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6 overflow-hidden">
                {assignedByAdmin.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onUpdateTask={updateTask}
                    rocks={rocks}
                    currentUser={currentUser}
                    isSelected={selectedTasks.has(task.id)}
                    onToggleSelection={handleToggleTaskSelection}
                    showSelectionCheckbox={!isViewingOtherUser}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="w-full overflow-hidden">
            <CardHeader className="px-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <ClipboardList className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="truncate">My Personal Tasks</span>
                  </CardTitle>
                  <CardDescription className="text-sm">Tasks you've created for yourself</CardDescription>
                </div>
                {!isViewingOtherUser && personalTasks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={personalTasks.every((t) => selectedTasks.has(t.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleSelectAll(personalTasks)
                        } else {
                          handleClearSelection()
                        }
                      }}
                      aria-label="Select all personal tasks"
                    />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 overflow-hidden">
              {personalTasks.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No personal tasks yet"
                  description="Stay organized by creating tasks for yourself. Track your daily to-dos and link them to your quarterly rocks."
                  action={{
                    label: "Create your first task!",
                    onClick: () => setShowAddTaskModal(true),
                  }}
                  size="sm"
                />
              ) : (
                <div className="space-y-3">
                  {personalTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onUpdateTask={updateTask}
                      rocks={rocks}
                      currentUser={currentUser}
                      isSelected={selectedTasks.has(task.id)}
                      onToggleSelection={handleToggleTaskSelection}
                      showSelectionCheckbox={!isViewingOtherUser}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 w-full overflow-hidden">
          {completedTasks.length === 0 ? (
            <Card className="w-full">
              <CardContent className="py-2">
                <EmptyState
                  icon={ClipboardList}
                  title="No completed tasks yet"
                  description="Tasks you complete will appear here. Start checking off your to-dos to build momentum!"
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full overflow-hidden">
              <CardHeader className="px-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base sm:text-lg">Completed Tasks</CardTitle>
                    <CardDescription className="text-sm">Tasks you've finished</CardDescription>
                  </div>
                  {!isViewingOtherUser && completedTasks.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={completedTasks.every((t) => selectedTasks.has(t.id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            handleSelectAll(completedTasks)
                          } else {
                            handleClearSelection()
                          }
                        }}
                        aria-label="Select all completed tasks"
                      />
                      <span className="text-sm text-muted-foreground">Select All</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 sm:px-6 overflow-hidden">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={handleCompleteTask}
                    onUpdateTask={updateTask}
                    rocks={rocks}
                    currentUser={currentUser}
                    isSelected={selectedTasks.has(task.id)}
                    onToggleSelection={handleToggleTaskSelection}
                    showSelectionCheckbox={!isViewingOtherUser}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      )}

      <AddTaskModal
        open={showAddTaskModal}
        onOpenChange={(open) => {
          setShowAddTaskModal(open)
          if (!open) setEditingTask(null)
        }}
        onSubmit={handleAddTask}
        userRocks={userRocks}
        projects={projects}
        initialTask={editingTask ?? undefined}
      />

      {/* Bulk Action Bar */}
      {selectedTasks.size > 0 && !isViewingOtherUser && (
        <div className="fixed left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg bulk-action-bar-offset">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {selectedTasks.size}
                </div>
                <span className="font-medium text-slate-900 text-sm sm:text-base">
                  {selectedTasks.size} task{selectedTasks.size > 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearSelection}
                  className="gap-1 sm:gap-2 h-9 px-2 sm:px-3"
                  disabled={isBulkProcessing}
                >
                  <X className="h-4 w-4" />
                  <span className="hidden sm:inline">Clear</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 h-9 px-2 sm:px-3" disabled={isBulkProcessing}>
                      <Flag className="h-4 w-4" />
                      <span className="hidden sm:inline">Priority</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkPriority("high")}>🔴 High</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkPriority("normal")}>🟡 Normal</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkPriority("low")}>🟢 Low</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBulkComplete}
                  className="gap-1 sm:gap-2 h-9 px-2 sm:px-3"
                  disabled={isBulkProcessing}
                >
                  {isBulkProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckSquare className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{isBulkProcessing ? "Processing..." : "Complete"}</span>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="gap-1 sm:gap-2 h-9 px-2 sm:px-3"
                  disabled={isBulkProcessing}
                >
                  {isBulkProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedTasks.size} selected task{selectedTasks.size > 1 ? "s" : ""}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </FeatureGate>
  )
}
