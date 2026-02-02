"use client"

import { useMemo } from "react"
import type { AssignedTask } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  GripVertical,
  Target,
  CalendarDays,
  AlertCircle,
  CheckCircle,
  InfoIcon,
  Flame,
  Circle,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

interface EnhancedKanbanCardProps {
  task: AssignedTask
  isDragging?: boolean
  onClick?: () => void
}

export function EnhancedKanbanCard({
  task,
  isDragging,
  onClick,
}: EnhancedKanbanCardProps) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "completed"

  const isCompleted = task.status === "completed"

  // Calculate progress if task has subtasks (future feature)
  const progress = useMemo(() => {
    // This can be extended when we add subtasks
    return isCompleted ? 100 : 0
  }, [isCompleted])

  const getPriorityIcon = () => {
    if (isCompleted)
      return <CheckCircle className="h-4 w-4 text-emerald-500" />
    switch (task.priority) {
      case "high":
        return <Flame className="h-4 w-4 text-red-500" />
      case "medium":
        return <InfoIcon className="h-4 w-4 text-amber-500" />
      default:
        return <Circle className="h-4 w-4 text-slate-400" />
    }
  }

  const getPriorityBadgeVariant = () => {
    switch (task.priority) {
      case "high":
        return "high" as const
      case "medium":
        return "medium" as const
      default:
        return "low" as const
    }
  }

  return (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md overflow-hidden",
        isDragging && "opacity-50 shadow-lg scale-105",
        isOverdue && "border-red-300 bg-red-50/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Top Section */}
        <div className="px-3 py-2.5">
          <div className="flex items-start gap-2 mb-2">
            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium leading-tight line-clamp-2 whitespace-pre-wrap break-words">
                {task.title}
              </h3>
            </div>
            {getPriorityIcon()}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-6">
              {task.description}
            </p>
          )}

          {/* Rock Association */}
          {task.rockTitle && (
            <div className="flex items-center gap-1.5 mt-2 pl-6">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                <Target className="h-2.5 w-2.5 mr-1" />
                {task.rockTitle}
              </Badge>
            </div>
          )}
        </div>

        {/* Bottom Section with Metadata */}
        <div className="px-3 py-2 border-t border-dashed border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              {/* Due Date */}
              {task.dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 border border-border rounded-sm py-0.5 px-1.5",
                    isOverdue
                      ? "border-red-300 bg-red-100 text-red-700"
                      : "bg-background"
                  )}
                >
                  {isOverdue ? (
                    <AlertCircle className="h-3 w-3" />
                  ) : (
                    <CalendarDays className="h-3 w-3" />
                  )}
                  <span className="text-[10px] font-medium">
                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}

              {/* Priority Badge */}
              <Badge
                variant={getPriorityBadgeVariant()}
                className="text-[10px] px-1.5 py-0.5"
              >
                {task.priority}
              </Badge>

              {/* Progress Indicator (if completed) */}
              {isCompleted && (
                <div className="flex items-center gap-1.5 border border-emerald-300 bg-emerald-50 rounded-sm py-0.5 px-1.5">
                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                  <span className="text-[10px] font-medium text-emerald-700">
                    Done
                  </span>
                </div>
              )}
            </div>

            {/* Assignee Avatar */}
            {task.assigneeName && (
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-[10px] font-semibold">
                  {task.assigneeName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
