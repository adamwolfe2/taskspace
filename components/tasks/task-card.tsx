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
import { TaskDetailModal } from "./task-detail-modal"

interface TaskCardProps {
  task: AssignedTask
  onComplete: (taskId: string) => void
  onEdit?: (task: AssignedTask) => void
  onDelete?: (taskId: string) => void
  onUpdateTask?: (id: string, updates: Partial<AssignedTask>) => Promise<AssignedTask>
  rocks: Rock[]
  currentUser?: TeamMember
}

function getDueDateStatus(dueDate: string, isCompleted: boolean) {
  if (isCompleted) return null

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
  if (daysUntilDue <= 3) {
    return {
      label: `Due in ${daysUntilDue} days`,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      icon: Calendar,
    }
  }
  return null
}

export function TaskCard({ task, onComplete, onEdit, onDelete, onUpdateTask, rocks, currentUser }: TaskCardProps) {
  const [showDetail, setShowDetail] = useState(false)
  const isCompleted = task.status === "completed"
  const isPersonal = task.type === "personal"
  const dueDateStatus = getDueDateStatus(task.dueDate, isCompleted)
  const commentCount = task.comments?.length || 0

  const priorityConfig = {
    high: { emoji: "🔴", label: "High", variant: "destructive" as const },
    medium: { emoji: "🟡", label: "Medium", variant: "default" as const },
    normal: { emoji: "🟢", label: "Normal", variant: "secondary" as const },
  }

  const priority = priorityConfig[task.priority]

  return (
    <>
    <Card
      className={cn(
        "p-4 transition-all",
        isCompleted && "opacity-60 bg-muted/50",
        !isCompleted && isPersonal && "border-l-4 border-l-primary",
        !isCompleted && !isPersonal && "border-l-4 border-l-blue-500",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={() => !isCompleted && onComplete(task.id)}
          className="mt-1"
          disabled={isCompleted}
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className={cn("font-medium", isCompleted && "line-through text-muted-foreground")}>{task.title}</h3>
            {isPersonal && !isCompleted && (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={() => onDelete(task.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {task.description && (
            <p className={cn("text-sm text-muted-foreground", isCompleted && "line-through")}>{task.description}</p>
          )}

          {task.rockTitle && (
            <p className="text-sm text-muted-foreground">
              Related Rock: <span className="font-medium">{task.rockTitle}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={priority.variant}>
              {priority.emoji} {priority.label}
            </Badge>
            {dueDateStatus ? (
              <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium", dueDateStatus.bgColor, dueDateStatus.color)}>
                <dueDateStatus.icon className="h-3 w-3" />
                <span>{dueDateStatus.label}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
              </div>
            )}
            {!isPersonal && task.assignedByName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Assigned by: {task.assignedByName}</span>
              </div>
            )}
            {task.recurrence && (
              <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-medium">
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
              >
                <MessageSquare className="h-3.5 w-3.5" />
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
