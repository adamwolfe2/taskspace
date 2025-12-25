"use client"

import type { AssignedTask, Rock } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, User, Pencil, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: AssignedTask
  onComplete: (taskId: string) => void
  onEdit?: (task: AssignedTask) => void
  onDelete?: (taskId: string) => void
  rocks: Rock[]
}

export function TaskCard({ task, onComplete, onEdit, onDelete, rocks }: TaskCardProps) {
  const isCompleted = task.status === "completed"
  const isPersonal = task.type === "personal"

  const priorityConfig = {
    high: { emoji: "🔴", label: "High", variant: "destructive" as const },
    medium: { emoji: "🟡", label: "Medium", variant: "default" as const },
    normal: { emoji: "🟢", label: "Normal", variant: "secondary" as const },
  }

  const priority = priorityConfig[task.priority]

  return (
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
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Due: {format(new Date(task.dueDate), "MMM d, yyyy")}</span>
            </div>
            {!isPersonal && task.assignedByName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Assigned by: {task.assignedByName}</span>
              </div>
            )}
          </div>

          {isCompleted && task.completedAt && (
            <p className="text-xs text-muted-foreground">
              Completed at {format(new Date(task.completedAt), "h:mm a")}
              {task.addedToEOD && " • Added to EOD ✓"}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
