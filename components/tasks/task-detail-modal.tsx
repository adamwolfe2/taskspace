"use client"

import { useState, useEffect } from "react"
import type { AssignedTask, TaskComment, TaskSubtask, TeamMember, Rock } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskComments } from "./task-comments"
import { TaskSubtasks } from "./task-subtasks"
import { format, differenceInDays, isToday, isTomorrow, isPast, startOfDay } from "date-fns"
import { Calendar, User, Target, AlertCircle, Clock, CheckCircle2, FolderKanban } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"
import { cn } from "@/lib/utils"

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: AssignedTask
  currentUser: TeamMember
  onUpdateTask: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
}

function getDueDateStatus(dueDate: string | null, isCompleted: boolean) {
  if (isCompleted || !dueDate) return null

  const today = startOfDay(new Date())
  const due = startOfDay(new Date(dueDate))
  const daysUntilDue = differenceInDays(due, today)

  if (isPast(due) && !isToday(due)) {
    return {
      label: `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} overdue`,
      color: "text-red-600",
      bgColor: "bg-red-50",
      icon: AlertCircle,
    }
  }
  if (isToday(due)) {
    return {
      label: "Due today",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      icon: Clock,
    }
  }
  if (isTomorrow(due)) {
    return {
      label: "Due tomorrow",
      color: "text-amber-500",
      bgColor: "bg-amber-50/50",
      icon: Clock,
    }
  }
  return null
}

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  currentUser,
  onUpdateTask,
}: TaskDetailModalProps) {
  const [comments, setComments] = useState<TaskComment[]>(task.comments || [])
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([])
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false)
  const { toast } = useToast()
  const themedColors = useThemedIconColors()

  const isCompleted = task.status === "completed"
  const dueDateStatus = getDueDateStatus(task.dueDate, isCompleted)

  const priorityConfig = {
    high: { label: "High", variant: "destructive" as const, color: "text-red-600" },
    medium: { label: "Medium", variant: "default" as const, color: "text-amber-600" },
    normal: { label: "Normal", variant: "secondary" as const, color: "text-slate-600" },
    low: { label: "Low", variant: "secondary" as const, color: "text-slate-400" },
  }

  const priority = priorityConfig[task.priority]

  const handleAddComment = async (text: string) => {
    const newComment: TaskComment = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      userName: currentUser.name,
      text,
      createdAt: new Date().toISOString(),
    }

    const updatedComments = [...comments, newComment]
    setComments(updatedComments)

    try {
      await onUpdateTask(task.id, { comments: updatedComments })
      toast({
        title: "Comment added",
        description: "Your note has been saved",
      })
    } catch (err: unknown) {
      // Revert on error
      setComments(comments)
      toast({
        title: "Failed to add comment",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  // Load subtasks when modal opens
  useEffect(() => {
    if (open) {
      loadSubtasks()
    }
  }, [open, task.id])

  const loadSubtasks = async () => {
    setIsLoadingSubtasks(true)
    try {
      const response = await fetch(`/api/tasks/${task.id}/subtasks`)
      const result = await response.json()
      if (result.success && result.data) {
        setSubtasks(result.data)
      }
    } catch (error) {
      // Error loading subtasks
    } finally {
      setIsLoadingSubtasks(false)
    }
  }

  const handleAddSubtask = async (title: string) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ title }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to add subtask")
      }

      setSubtasks([...subtasks, result.data])
      toast({
        title: "Subtask added",
        description: "Subtask has been added to the task",
      })
    } catch (error: unknown) {
      toast({
        title: "Failed to add subtask",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleToggleSubtask = async (subtaskId: string) => {
    try {
      const subtask = subtasks.find((s) => s.id === subtaskId)
      if (!subtask) return

      const response = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ completed: !subtask.completed }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to toggle subtask")
      }

      setSubtasks(subtasks.map((s) => (s.id === subtaskId ? result.data : s)))
    } catch (error: unknown) {
      toast({
        title: "Failed to update subtask",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/subtasks/${subtaskId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to delete subtask")
      }

      setSubtasks(subtasks.filter((s) => s.id !== subtaskId))
      toast({
        title: "Subtask deleted",
        description: "Subtask has been removed",
      })
    } catch (error: unknown) {
      toast({
        title: "Failed to delete subtask",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleReorderSubtasks = async (subtaskIds: string[]) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}/subtasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ subtaskIds }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to reorder subtasks")
      }

      setSubtasks(result.data)
    } catch (error: unknown) {
      toast({
        title: "Failed to reorder subtasks",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleCompleteTask = async () => {
    try {
      await onUpdateTask(task.id, {
        status: isCompleted ? "pending" : "completed",
        completedAt: isCompleted ? null : new Date().toISOString(),
      })
      toast({
        title: isCompleted ? "Task reopened" : "Task completed!",
        description: isCompleted ? "Task marked as pending" : "Great job!",
      })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "p-2 rounded-lg shrink-0",
                isCompleted ? "bg-emerald-50" : "bg-slate-100"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <Target className="h-5 w-5" style={{ color: themedColors.secondary }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle
                className={cn(
                  "text-lg",
                  isCompleted && "line-through text-slate-400"
                )}
              >
                {task.title}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant={priority.variant}>{priority.label}</Badge>
                {dueDateStatus ? (
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded",
                      dueDateStatus.bgColor,
                      dueDateStatus.color
                    )}
                  >
                    <dueDateStatus.icon className="h-3 w-3" />
                    {dueDateStatus.label}
                  </span>
                ) : task.dueDate ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: themedColors.secondary }}>
                    <Calendar className="h-3 w-3" />
                    Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </span>
                ) : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-1">Description</h4>
              <p className="text-sm text-slate-600">{task.description}</p>
            </div>
          )}

          {/* Related Rock */}
          {task.rockTitle && (
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4" style={{ color: themedColors.primary }} />
              <span className="text-slate-600">Related to:</span>
              <span className="font-medium text-slate-900">{task.rockTitle}</span>
            </div>
          )}

          {/* Related Project */}
          {task.projectName && (
            <div className="flex items-center gap-2 text-sm">
              <FolderKanban className="h-4 w-4" style={{ color: themedColors.primary }} />
              <span className="text-slate-600">Project:</span>
              <span className="font-medium text-slate-900">{task.projectName}</span>
            </div>
          )}

          {/* Assigned by */}
          {task.assignedByName && task.type === "assigned" && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" style={{ color: themedColors.secondary }} />
              <span className="text-slate-600">Assigned by:</span>
              <span className="font-medium text-slate-900">{task.assignedByName}</span>
            </div>
          )}

          {/* Completion info */}
          {isCompleted && task.completedAt && (
            <div className="flex items-center gap-2 text-sm bg-emerald-50 p-2 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-700">
                Completed on {format(new Date(task.completedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          )}

          {/* Subtasks section */}
          {!isLoadingSubtasks && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Subtasks</h4>
              <TaskSubtasks
                subtasks={subtasks}
                onAdd={handleAddSubtask}
                onToggle={handleToggleSubtask}
                onDelete={handleDeleteSubtask}
                onReorder={handleReorderSubtasks}
                disabled={isCompleted}
              />
            </div>
          )}

          {/* Comments section */}
          <div className="border-t pt-4">
            <TaskComments
              comments={comments}
              currentUser={currentUser}
              onAddComment={handleAddComment}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleCompleteTask}
            variant={isCompleted ? "outline" : "default"}
          >
            {isCompleted ? "Reopen Task" : "Mark Complete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
