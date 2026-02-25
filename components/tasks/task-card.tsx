"use client"

import { useState } from "react"
import type { AssignedTask, Rock, TeamMember } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, User, Pencil, Trash2, AlertCircle, Clock, MessageSquare, Repeat } from "lucide-react"
import { format, differenceInDays, isToday, isTomorrow, isPast, startOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import { TaskDetailModal } from "./task-detail-modal"

interface TaskCardProps {
  task: AssignedTask
  onComplete: (taskId: string) => void
  onEdit?: (task: AssignedTask) => void
  onDelete?: (taskId: string) => void
  onUpdateTask?: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
  rocks: Rock[]
  currentUser?: TeamMember
  isSelected?: boolean
  onToggleSelection?: (taskId: string) => void
  showSelectionCheckbox?: boolean
}

function getDueDateStatus(dueDate: string | null, isCompleted: boolean) {
  if (isCompleted || !dueDate) return null

  const today = startOfDay(new Date())
  const due = startOfDay(new Date(dueDate))
  const daysUntilDue = differenceInDays(due, today)

  if (isPast(due) && !isToday(due)) {
    return {
      label: `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} overdue`,
      semanticStatus: "blocked" as const,
      icon: AlertCircle,
    }
  }
  if (isToday(due)) {
    return {
      label: "Due today",
      semanticStatus: "at-risk" as const,
      icon: Clock,
    }
  }
  if (isTomorrow(due)) {
    return {
      label: "Due tomorrow",
      semanticStatus: "at-risk" as const,
      icon: Clock,
    }
  }
  if (daysUntilDue <= 3) {
    return {
      label: `Due in ${daysUntilDue} days`,
      semanticStatus: "pending" as const,
      icon: Calendar,
    }
  }
  return null
}

export function TaskCard({ task, onComplete, onEdit, onDelete, onUpdateTask, rocks: _rocks, currentUser, isSelected, onToggleSelection, showSelectionCheckbox }: TaskCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const [showFullDescription, setShowFullDescription] = useState(false)
  const { getStatusStyle, getPriorityStyle } = useBrandStatusStyles()
  const isCompleted = task.status === "completed"
  const isPersonal = task.type === "personal"
  const dueDateStatus = getDueDateStatus(task.dueDate, isCompleted)
  const commentCount = task.comments?.length || 0

  // Check if description is long (over 100 chars)
  const isLongDescription = task.description && task.description.length > 100

  const priorityConfig = {
    high: { emoji: "🔴", label: "High" },
    medium: { emoji: "🟡", label: "Medium" },
    normal: { emoji: "🟢", label: "Normal" },
    low: { emoji: "🔵", label: "Low" },
  }

  const priority = priorityConfig[task.priority]

  return (
    <>
    <Card
      className={cn(
        "p-3 sm:p-4 transition-all overflow-hidden w-full",
        isCompleted && "opacity-60 bg-muted/50",
        !isCompleted && dueDateStatus?.semanticStatus === "blocked" && "border-l-4 border-l-red-500 bg-red-50/40",
        !isCompleted && dueDateStatus?.semanticStatus === "at-risk" && "border-l-4 border-l-amber-400",
        !isCompleted && !dueDateStatus && isPersonal && "border-l-4 border-l-primary",
        !isCompleted && !dueDateStatus && !isPersonal && "border-l-4 border-l-blue-500",
        isSelected && "ring-2 ring-blue-500 ring-offset-2",
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3 min-w-0">
        {showSelectionCheckbox && onToggleSelection && (
          <Checkbox
            checked={isSelected || false}
            onCheckedChange={() => onToggleSelection(task.id)}
            className="mt-1 flex-shrink-0"
            aria-label={`Select task "${task.title}"`}
          />
        )}
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => !isCompleted && onComplete(task.id)}
          className="mt-1 flex-shrink-0"
          disabled={isCompleted}
          aria-label={isCompleted ? `Task "${task.title}" completed` : `Mark task "${task.title}" as complete`}
        />
        <div className="flex-1 space-y-2 min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn(
              "font-medium break-words line-clamp-2 whitespace-pre-wrap",
              isCompleted && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h3>
            {isPersonal && !isCompleted && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {onEdit && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 touch-target" onClick={() => onEdit(task)} aria-label="Edit task">
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 touch-target" onClick={() => onDelete(task.id)} aria-label="Delete task">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {task.description && (
            <div>
              <p className={cn(
                "text-sm text-muted-foreground break-words whitespace-pre-wrap",
                isCompleted && "line-through",
                !showFullDescription && isLongDescription && "line-clamp-2"
              )}>
                {task.description}
              </p>
              {isLongDescription && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-xs text-slate-500 hover:text-slate-700 mt-1 underline"
                  aria-expanded={showFullDescription}
                  aria-label={showFullDescription ? "Show less of description" : "Show more of description"}
                >
                  {showFullDescription ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {task.rockTitle && (
            <p className="text-sm text-muted-foreground truncate">
              Related Rock: <span className="font-medium">{task.rockTitle}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" style={getPriorityStyle(task.priority)}>
              {priority.emoji} {priority.label}
            </Badge>
            {dueDateStatus ? (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={getStatusStyle(dueDateStatus.semanticStatus)}
              >
                <dueDateStatus.icon className="h-3 w-3" />
                <span>{dueDateStatus.label}</span>
              </div>
            ) : task.dueDate ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
              </div>
            ) : null}
            {!isPersonal && task.assignedByName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Assigned by: {task.assignedByName}</span>
              </div>
            )}
            {task.recurrence && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={getStatusStyle("in-progress")}
              >
                <Repeat className="h-3 w-3" />
                <span>
                  {task.recurrence.interval === 1
                    ? task.recurrence.type === "daily"
                      ? "Daily"
                      : task.recurrence.type === "weekly"
                        ? "Weekly"
                        : "Monthly"
                    : `Every ${task.recurrence.interval} ${task.recurrence.type.replace("ly", "")}${task.recurrence.interval > 1 ? "s" : ""}`}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            {isCompleted && task.completedAt && (
              <p className="text-xs text-muted-foreground">
                Completed at {format(new Date(task.completedAt), "h:mm a")}
                {task.addedToEOD && " • Added to EOD ✓"}
              </p>
            )}
            {currentUser && onUpdateTask && (
              <button
                onClick={() => setShowDetail(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors ml-auto"
                aria-label={commentCount > 0 ? `View ${commentCount} note${commentCount > 1 ? "s" : ""}` : "Add note to task"}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                {commentCount > 0 ? `${commentCount} note${commentCount > 1 ? "s" : ""}` : "Add note"}
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>

    {/* Task Detail Modal */}
    {showDetail && currentUser && onUpdateTask && (
      <TaskDetailModal
        open={showDetail}
        onOpenChange={setShowDetail}
        task={task}
        currentUser={currentUser}
        onUpdateTask={onUpdateTask}
      />
    )}
    </>
  )
}
