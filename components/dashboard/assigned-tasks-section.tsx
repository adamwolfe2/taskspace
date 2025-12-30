"use client"

import { useState, useEffect } from "react"
import type { AssignedTask, Rock, TeamMember } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils/date-utils"
import { CheckSquare, ArrowRight, Circle, RefreshCw, ChevronDown, AlertCircle, Clock, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useApp } from "@/lib/contexts/app-context"
import { differenceInDays, isToday, isTomorrow, isPast, startOfDay } from "date-fns"
import { AddTaskModal } from "@/components/tasks/add-task-modal"
import { TaskDetailModal } from "@/components/tasks/task-detail-modal"

function getDueDateStatus(dueDate: string) {
  const today = startOfDay(new Date())
  const due = startOfDay(new Date(dueDate))
  const daysUntilDue = differenceInDays(due, today)

  if (isPast(due) && !isToday(due)) {
    return {
      label: `${Math.abs(daysUntilDue)}d overdue`,
      color: "text-red-600",
      bgColor: "bg-red-50",
      Icon: AlertCircle,
    }
  }
  if (isToday(due)) {
    return {
      label: "Due today",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      Icon: Clock,
    }
  }
  if (isTomorrow(due)) {
    return {
      label: "Tomorrow",
      color: "text-amber-500",
      bgColor: "bg-amber-50/50",
      Icon: Clock,
    }
  }
  return null
}

const TASKS_PER_PAGE = 10

interface AssignedTasksSectionProps {
  tasks: AssignedTask[]
  onToggleTask: (taskId: string) => void
  onTasksUpdated?: () => void
  userRocks?: Rock[]
  currentUser?: TeamMember
  onAddTask?: (taskData: {
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
    recurrence?: AssignedTask["recurrence"]
  }) => Promise<void>
  onUpdateTask?: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
  onDeleteTask?: (id: string) => Promise<void>
}

export function AssignedTasksSection({
  tasks,
  onToggleTask,
  onTasksUpdated,
  userRocks = [],
  currentUser,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: AssignedTasksSectionProps) {
  const { toast } = useToast()
  const { setCurrentPage } = useApp()
  const [asanaConnected, setAsanaConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [visiblePendingCount, setVisiblePendingCount] = useState(TASKS_PER_PAGE)
  const [visibleCompletedCount, setVisibleCompletedCount] = useState(5)
  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<AssignedTask | null>(null)

  // Sort tasks: platform-assigned (manual) first, then Asana tasks
  const sortBySource = (a: AssignedTask, b: AssignedTask) => {
    const sourceA = a.source || "manual"
    const sourceB = b.source || "manual"
    if (sourceA === "manual" && sourceB === "asana") return -1
    if (sourceA === "asana" && sourceB === "manual") return 1
    return 0
  }

  const pendingTasks = tasks.filter((t) => t.status !== "completed").sort(sortBySource)
  const completedTasks = tasks.filter((t) => t.status === "completed").sort(sortBySource)

  const visiblePendingTasks = pendingTasks.slice(0, visiblePendingCount)
  const visibleCompletedTasks = completedTasks.slice(0, visibleCompletedCount)
  const hasMorePending = pendingTasks.length > visiblePendingCount
  const hasMoreCompleted = completedTasks.length > visibleCompletedCount

  // Check if user has Asana connected
  useEffect(() => {
    const checkAsanaConnection = async () => {
      try {
        const response = await fetch("/api/asana/me/connect")
        const data = await response.json()
        if (data.success) {
          setAsanaConnected(data.data.connected)
        }
      } catch (err) {
        console.error("Failed to check Asana connection:", err)
      } finally {
        setIsCheckingConnection(false)
      }
    }
    checkAsanaConnection()
  }, [])

  const handleSyncAsana = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/asana/me/sync", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        const result = data.data
        if (result.tasksImported > 0 || result.tasksCompleted > 0) {
          toast({
            title: "Sync complete",
            description: `Imported ${result.tasksImported} new tasks${result.tasksCompleted > 0 ? `, ${result.tasksCompleted} marked complete` : ""}`,
          })
          // Trigger refresh of tasks
          onTasksUpdated?.()
        } else {
          toast({
            title: "Already up to date",
            description: "No new tasks to sync from Asana",
          })
        }
      } else {
        toast({
          title: "Sync failed",
          description: data.error || "Failed to sync with Asana",
          variant: "destructive",
        })
      }
    } catch (err) {
      toast({
        title: "Sync failed",
        description: "Failed to connect to Asana",
        variant: "destructive",
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "high":
        return { bgColor: "bg-red-50", textColor: "text-red-700" }
      case "medium":
        return { bgColor: "bg-amber-50", textColor: "text-amber-700" }
      default:
        return { bgColor: "bg-slate-100", textColor: "text-slate-700" }
    }
  }

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDeleteTask) return

    try {
      await onDeleteTask(taskId)
      toast({
        title: "Task deleted",
        description: "Your task has been removed",
      })
      onTasksUpdated?.()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete task",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-card">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-900">My Tasks</h3>
            <span className="text-sm text-slate-500">({tasks.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {onAddTask && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAddTaskModal(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Task
              </Button>
            )}
            {!isCheckingConnection && asanaConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAsana}
                disabled={isSyncing}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Asana"}
              </Button>
            )}
            {tasks.length > 0 && (
              <button className="text-sm text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-5">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No tasks assigned yet</p>
            <p className="text-sm text-slate-400 mt-1">Tasks assigned to you will appear here</p>
            {!isCheckingConnection && asanaConnected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAsana}
                disabled={isSyncing}
                className="mt-4 gap-1.5"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Import from Asana"}
              </Button>
            )}
            {!isCheckingConnection && !asanaConnected && (
              <p className="text-xs text-slate-400 mt-4">
                <button
                  onClick={() => setCurrentPage("settings")}
                  className="text-blue-500 hover:underline"
                >
                  Connect Asana
                </button>{" "}
                to sync your tasks
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Pending ({pendingTasks.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {visiblePendingTasks.map((task) => {
                    const priorityConfig = getPriorityConfig(task.priority)
                    const dueDateStatus = task.dueDate ? getDueDateStatus(task.dueDate) : null
                    const isPersonal = task.type === "personal"
                    return (
                      <div
                        key={task.id}
                        onClick={() => onUpdateTask && currentUser && setSelectedTask(task)}
                        className={`flex items-start gap-3 p-3 border rounded-lg hover:border-slate-300 transition-colors duration-200 ${
                          dueDateStatus?.bgColor === "bg-red-50" ? "border-red-200 bg-red-50/30" : "border-slate-200"
                        } ${onUpdateTask && currentUser ? "cursor-pointer" : ""}`}
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={(e) => {
                            e.stopPropagation?.()
                            onToggleTask(task.id)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-slate-900">{task.title}</p>
                            <span className={`status-pill ${priorityConfig.bgColor} ${priorityConfig.textColor}`}>
                              {task.priority}
                            </span>
                            {dueDateStatus && (
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${dueDateStatus.bgColor} ${dueDateStatus.color}`}>
                                <dueDateStatus.Icon className="h-3 w-3" />
                                {dueDateStatus.label}
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            {task.dueDate && !dueDateStatus && (
                              <span className="text-xs text-slate-400">Due: {formatDate(task.dueDate)}</span>
                            )}
                            {task.rockTitle && (
                              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                {task.rockTitle}
                              </span>
                            )}
                          </div>
                        </div>
                        {isPersonal && onDeleteTask && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 flex-shrink-0"
                            onClick={(e) => handleDeleteTask(task.id, e)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {hasMorePending && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisiblePendingCount((prev) => prev + TASKS_PER_PAGE)}
                    className="w-full text-slate-500 hover:text-slate-700"
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Load more ({pendingTasks.length - visiblePendingCount} remaining)
                  </Button>
                )}
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Completed ({completedTasks.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {visibleCompletedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border border-slate-100 rounded-lg bg-slate-50/50"
                    >
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => onToggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium line-through text-slate-400">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setVisibleCompletedCount((prev) => prev + TASKS_PER_PAGE)}
                    className="w-full text-slate-500 hover:text-slate-700"
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Load more ({completedTasks.length - visibleCompletedCount} remaining)
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {onAddTask && (
        <AddTaskModal
          open={showAddTaskModal}
          onOpenChange={setShowAddTaskModal}
          onSubmit={async (taskData) => {
            await onAddTask(taskData)
            toast({
              title: "Task created",
              description: taskData.recurrence
                ? `Recurring task created (${taskData.recurrence.type})`
                : "Your personal task has been added",
            })
            onTasksUpdated?.()
          }}
          userRocks={userRocks}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && currentUser && onUpdateTask && (
        <TaskDetailModal
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          task={selectedTask}
          currentUser={currentUser}
          onUpdateTask={async (id, updates) => {
            const updated = await onUpdateTask(id, updates)
            onTasksUpdated?.()
            return updated
          }}
        />
      )}
    </div>
  )
}
