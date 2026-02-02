"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Circle,
  PlayCircle,
  CheckCircle2,
  GripVertical,
  Target,
  CalendarDays,
} from "lucide-react"

interface DemoTask {
  id: string
  title: string
  priority: "high" | "medium" | "low"
  rockTitle?: string
  dueDate?: string
  status: "pending" | "in-progress" | "completed"
}

const INITIAL_TASKS: DemoTask[] = [
  {
    id: "1",
    title: "Redesign landing page hero section",
    priority: "high",
    rockTitle: "Improve Marketing Conversion",
    dueDate: "Dec 15",
    status: "in-progress",
  },
  {
    id: "2",
    title: "Set up analytics tracking for new flows",
    priority: "medium",
    rockTitle: "Launch Product Features",
    dueDate: "Dec 18",
    status: "pending",
  },
  {
    id: "3",
    title: "Review candidate resumes for engineering role",
    priority: "high",
    rockTitle: "Build Engineering Team",
    dueDate: "Dec 12",
    status: "pending",
  },
  {
    id: "4",
    title: "Complete onboarding flow improvements",
    priority: "medium",
    dueDate: "Dec 10",
    status: "completed",
  },
  {
    id: "5",
    title: "Update team documentation",
    priority: "low",
    dueDate: "Dec 20",
    status: "completed",
  },
]

const columns = [
  {
    id: "pending" as const,
    title: "To Do",
    icon: Circle,
    color: "text-slate-500",
    bgColor: "bg-slate-50 border-slate-200",
  },
  {
    id: "in-progress" as const,
    title: "In Progress",
    icon: PlayCircle,
    color: "text-gray-700",
    bgColor: "bg-gray-100 border-gray-300",
  },
  {
    id: "completed" as const,
    title: "Completed",
    icon: CheckCircle2,
    color: "text-gray-900",
    bgColor: "bg-gray-200 border-gray-400",
  },
]

export function DemoKanban() {
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDrop = (status: DemoTask["status"]) => {
    if (!draggedTask) return

    setTasks(tasks.map(task =>
      task.id === draggedTask ? { ...task, status } : task
    ))
    setDraggedTask(null)
  }

  const getTasksByStatus = (status: DemoTask["status"]) => {
    return tasks.filter(task => task.status === status)
  }

  const priorityColors = {
    high: "destructive" as const,
    medium: "medium" as const,
    low: "low" as const,
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id)
          const ColumnIcon = column.icon

          return (
            <div
              key={column.id}
              className={`rounded-xl border p-4 ${column.bgColor} min-h-[500px]`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(column.id)}
            >
              <div className="flex items-center gap-2 mb-4">
                <ColumnIcon className={`h-5 w-5 ${column.color}`} />
                <h3 className="font-semibold text-slate-900">{column.title}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {columnTasks.length}
                </Badge>
              </div>

              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                    Drop tasks here
                  </div>
                ) : (
                  columnTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      onDragEnd={() => setDraggedTask(null)}
                    >
                      <Card
                        className={`cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md ${
                          draggedTask === task.id ? "opacity-50 rotate-2" : ""
                        }`}
                      >
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1 min-w-0">
                              <GripVertical className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm font-medium line-clamp-2">
                                {task.title}
                              </span>
                            </div>
                            <Badge
                              variant={priorityColors[task.priority]}
                              className="text-xs flex-shrink-0"
                            >
                              {task.priority}
                            </Badge>
                          </div>

                          {task.rockTitle && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <Target className="h-3 w-3" />
                              <span className="truncate">{task.rockTitle}</span>
                            </div>
                          )}

                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <CalendarDays className="h-3 w-3" />
                              <span>{task.dueDate}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-600">
          ✨ Try dragging tasks between columns to update their status
        </p>
      </div>
    </div>
  )
}
