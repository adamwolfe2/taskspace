"use client"

import type { Task } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/date-utils"

interface TasksSectionProps {
  tasks: Task[]
  onToggleTask: (taskId: string) => void
}

export function TasksSection({ tasks, onToggleTask }: TasksSectionProps) {
  const groupedTasks = {
    urgent: tasks.filter((t) => t.category === "urgent"),
    today: tasks.filter((t) => t.category === "today"),
    upcoming: tasks.filter((t) => t.category === "upcoming"),
  }

  const categoryColors = {
    urgent: "bg-destructive text-destructive-foreground",
    today: "bg-warning text-warning-foreground",
    upcoming: "bg-primary text-primary-foreground",
  }

  const categoryLabels = {
    urgent: "Urgent",
    today: "Today",
    upcoming: "Upcoming",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          My Tasks
          <span className="text-sm font-normal text-muted-foreground">({tasks.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tasks yet</p>
        ) : (
          <>
            {Object.entries(groupedTasks).map(([category, categoryTasks]) =>
              categoryTasks.length > 0 ? (
                <div key={category} className="space-y-2">
                  <Badge className={categoryColors[category as keyof typeof categoryColors]}>
                    {categoryLabels[category as keyof typeof categoryLabels]} ({categoryTasks.length})
                  </Badge>
                  <div className="space-y-2">
                    {categoryTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => onToggleTask(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">Due: {formatDate(task.dueDate)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
