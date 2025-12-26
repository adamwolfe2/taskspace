"use client"

import type { AssignedTask } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/date-utils"

interface AssignedTasksSectionProps {
  tasks: AssignedTask[]
  onToggleTask: (taskId: string) => void
}

export function AssignedTasksSection({ tasks, onToggleTask }: AssignedTasksSectionProps) {
  const pendingTasks = tasks.filter((t) => t.status !== "completed")
  const completedTasks = tasks.filter((t) => t.status === "completed")

  const priorityColors = {
    high: "bg-destructive text-destructive-foreground",
    medium: "bg-warning text-warning-foreground",
    normal: "bg-primary text-primary-foreground",
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
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <Badge variant="secondary">Pending ({pendingTasks.length})</Badge>
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-accent transition-colors"
                    >
                      <Checkbox
                        checked={false}
                        onCheckedChange={() => onToggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{task.title}</p>
                          <Badge variant="outline" className={priorityColors[task.priority]}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground">Due: {formatDate(task.dueDate)}</p>
                          )}
                          {task.rockTitle && (
                            <Badge variant="outline" className="text-xs">
                              {task.rockTitle}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <Badge variant="outline">Completed ({completedTasks.length})</Badge>
                <div className="space-y-2">
                  {completedTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg opacity-60"
                    >
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => onToggleTask(task.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium line-through text-muted-foreground">{task.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
