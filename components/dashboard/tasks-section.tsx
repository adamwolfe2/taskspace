"use client"

import type { Task } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDate } from "@/lib/utils/date-utils"
import { CheckSquare, Clock, AlertTriangle, Calendar } from "lucide-react"

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

  const categoryConfig = {
    urgent: {
      label: "Urgent",
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      icon: AlertTriangle,
    },
    today: {
      label: "Today",
      bgColor: "bg-amber-50",
      textColor: "text-amber-700",
      icon: Clock,
    },
    upcoming: {
      label: "Upcoming",
      bgColor: "bg-slate-100",
      textColor: "text-slate-700",
      icon: Calendar,
    },
  }

  return (
    <div className="bg-white rounded-xl shadow-card">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-slate-900">My Tasks</h3>
          <span className="text-sm text-slate-500">({tasks.length})</span>
        </div>
      </div>
      <div className="p-5 space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No tasks yet</p>
            <p className="text-sm text-slate-400 mt-1">Your tasks will appear here</p>
          </div>
        ) : (
          <>
            {Object.entries(groupedTasks).map(([category, categoryTasks]) => {
              if (categoryTasks.length === 0) return null
              const config = categoryConfig[category as keyof typeof categoryConfig]
              const Icon = config.icon

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`status-pill ${config.bgColor} ${config.textColor}`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label} ({categoryTasks.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {categoryTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-3 p-3 border rounded-lg transition-all duration-200 ${
                          task.completed
                            ? "border-slate-100 bg-slate-50/50"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        }`}
                      >
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => onToggleTask(task.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <p className={`font-medium ${task.completed ? "line-through text-slate-400" : "text-slate-900"}`}>
                            {task.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-slate-400 mt-1">Due: {formatDate(task.dueDate)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
