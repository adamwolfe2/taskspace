"use client"

import { useState, useEffect } from "react"
import type { AssignedTask, TaskComment, TaskSubtask, TeamMember } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TaskComments } from "./task-comments"
import { TaskSubtasks } from "./task-subtasks"
import { format, differenceInDays, isToday, isTomorrow, isPast, startOfDay } from "date-fns"
import { Calendar, User, Target, AlertCircle, Clock, CheckCircle2, FolderKanban, Copy, Check, Pencil, X, PlayCircle } from "lucide-react"
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
  const [copiedLink, setCopiedLink] = useState(false)
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [editingPriority, setEditingPriority] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState(task.description || "")
  const [savingField, setSavingField] = useState<string | null>(null)
  const { toast } = useToast()
  const themedColors = useThemedIconColors()

  const isCompleted = task.status === "completed"
  const isInProgress = task.status === "in-progress"
  const dueDateStatus = getDueDateStatus(task.dueDate, isCompleted)

  const priorityConfig = {
    high: { label: "High", variant: "outline" as const, color: "text-slate-900" },
    medium: { label: "Medium", variant: "outline" as const, color: "text-slate-700" },
    normal: { label: "Normal", variant: "outline" as const, color: "text-slate-600" },
    low: { label: "Low", variant: "outline" as const, color: "text-slate-400" },
  }

  const priority = priorityConfig[task.priority]

  const handleUpdateDueDate = async (newDate: string) => {
    setSavingField("dueDate")
    setEditingDueDate(false)
    try {
      await onUpdateTask(task.id, { dueDate: newDate || null })
      toast({ title: "Due date updated" })
    } catch (err: unknown) {
      toast({ title: "Failed to update due date", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" })
    } finally {
      setSavingField(null)
    }
  }

  const handleUpdatePriority = async (newPriority: AssignedTask["priority"]) => {
    setSavingField("priority")
    setEditingPriority(false)
    try {
      await onUpdateTask(task.id, { priority: newPriority })
      toast({ title: "Priority updated" })
    } catch (err: unknown) {
      toast({ title: "Failed to update priority", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" })
    } finally {
      setSavingField(null)
    }
  }

  const handleUpdateDescription = async () => {
    const trimmed = descriptionDraft.trim()
    if (trimmed === (task.description || "").trim()) {
      setEditingDescription(false)
      return
    }
    setSavingField("description")
    setEditingDescription(false)
    try {
      await onUpdateTask(task.id, { description: trimmed || undefined })
      toast({ title: "Description updated" })
    } catch (err: unknown) {
      toast({ title: "Failed to update description", description: err instanceof Error ? err.message : "Please try again", variant: "destructive" })
    } finally {
      setSavingField(null)
    }
  }

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

  // Sync description draft when task changes externally
  useEffect(() => {
    if (!editingDescription) {
      setDescriptionDraft(task.description || "")
    }
  }, [task.description, editingDescription])

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
    } catch {
      toast({
        title: "Couldn't load subtasks",
        description: "Subtasks may not be visible. Try reopening.",
        variant: "destructive",
      })
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

  const handleSetInProgress = async () => {
    try {
      await onUpdateTask(task.id, { status: "in-progress" })
      toast({ title: "Task in progress", description: "Task marked as in progress" })
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
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div className="flex items-center gap-2">
                <DialogTitle
                  className={cn(
                    "text-lg flex-1",
                    isCompleted && "line-through text-slate-400"
                  )}
                >
                  {task.title}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Copy link to task"
                  onClick={() => {
                    const url = `${window.location.origin}/app?page=tasks&taskId=${task.id}`
                    navigator.clipboard.writeText(url).then(() => {
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    })
                  }}
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                </Button>
              </div>
              <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
                {/* Editable priority */}
                {!isCompleted && editingPriority ? (
                  <Select
                    defaultOpen
                    value={task.priority}
                    onValueChange={(v) => handleUpdatePriority(v as AssignedTask["priority"])}
                    onOpenChange={(open) => { if (!open) setEditingPriority(false) }}
                  >
                    <SelectTrigger className="h-6 w-24 text-xs px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <button
                    onClick={() => !isCompleted && setEditingPriority(true)}
                    disabled={isCompleted || savingField === "priority"}
                    className={cn("focus:outline-none", !isCompleted && "cursor-pointer hover:opacity-80")}
                    title={!isCompleted ? "Click to change priority" : undefined}
                  >
                    <Badge variant={priority.variant}>{savingField === "priority" ? "Saving…" : priority.label}</Badge>
                  </button>
                )}

                {/* Editable due date */}
                {!isCompleted && editingDueDate ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="date"
                      defaultValue={task.dueDate || ""}
                      autoFocus
                      className="h-6 text-xs px-2 w-32"
                      onBlur={(e) => {
                        if (e.target.value !== task.dueDate) handleUpdateDueDate(e.target.value)
                        else setEditingDueDate(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateDueDate((e.target as HTMLInputElement).value)
                        if (e.key === "Escape") setEditingDueDate(false)
                      }}
                    />
                    <button onClick={() => setEditingDueDate(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : dueDateStatus ? (
                  <button
                    onClick={() => !isCompleted && setEditingDueDate(true)}
                    disabled={isCompleted || savingField === "dueDate"}
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded",
                      dueDateStatus.bgColor,
                      dueDateStatus.color,
                      !isCompleted && "cursor-pointer hover:opacity-80"
                    )}
                    title={!isCompleted ? "Click to change due date" : undefined}
                  >
                    <dueDateStatus.icon className="h-3 w-3" />
                    {savingField === "dueDate" ? "Saving…" : dueDateStatus.label}
                  </button>
                ) : task.dueDate ? (
                  <button
                    onClick={() => !isCompleted && setEditingDueDate(true)}
                    disabled={isCompleted || savingField === "dueDate"}
                    className={cn("flex items-center gap-1 text-xs", !isCompleted && "cursor-pointer hover:opacity-80")}
                    style={{ color: themedColors.secondary }}
                    title={!isCompleted ? "Click to change due date" : undefined}
                  >
                    <Calendar className="h-3 w-3" />
                    {savingField === "dueDate" ? "Saving…" : `Due: ${format(new Date(task.dueDate), "MMM d, yyyy")}`}
                  </button>
                ) : !isCompleted ? (
                  <button
                    onClick={() => setEditingDueDate(true)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <Calendar className="h-3 w-3" />
                    Add due date
                  </button>
                ) : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-slate-700">Description</h4>
              {!isCompleted && !editingDescription && (
                <button
                  onClick={() => { setDescriptionDraft(task.description || ""); setEditingDescription(true) }}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <Pencil className="h-3 w-3" />
                  {task.description ? "Edit" : "Add"}
                </button>
              )}
            </div>
            {editingDescription ? (
              <div className="space-y-2">
                <Textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  autoFocus
                  rows={3}
                  className="text-sm resize-none"
                  placeholder="Add a description…"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") { setEditingDescription(false); setDescriptionDraft(task.description || "") }
                  }}
                />
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingDescription(false); setDescriptionDraft(task.description || "") }}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={handleUpdateDescription} disabled={savingField === "description"}>
                    {savingField === "description" ? "Saving…" : "Save"}
                  </Button>
                </div>
              </div>
            ) : task.description ? (
              <p className="text-sm text-slate-600">{task.description}</p>
            ) : !isCompleted ? (
              <button
                onClick={() => { setDescriptionDraft(""); setEditingDescription(true) }}
                className="text-sm text-slate-400 hover:text-slate-600 italic cursor-pointer"
              >
                No description — click to add one
              </button>
            ) : null}
          </div>

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
          {isLoadingSubtasks ? (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">Subtasks</h4>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded bg-slate-100 animate-pulse" />
                    <div className="h-4 flex-1 rounded bg-slate-100 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
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
          {!isCompleted && !isInProgress && (
            <Button variant="outline" onClick={handleSetInProgress} className="gap-1.5">
              <PlayCircle className="h-4 w-4 text-blue-500" />
              Start Working
            </Button>
          )}
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
