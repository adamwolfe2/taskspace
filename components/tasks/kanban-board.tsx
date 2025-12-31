"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { AssignedTask } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Clock,
  Target,
  GripVertical,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Circle,
  PlayCircle,
} from "lucide-react"

type KanbanColumn = "pending" | "in-progress" | "completed"

interface KanbanBoardProps {
  tasks: AssignedTask[]
  onTaskStatusChange: (taskId: string, newStatus: AssignedTask["status"]) => void
  onTaskClick?: (task: AssignedTask) => void
}

interface ColumnConfig {
  id: KanbanColumn
  title: string
  icon: typeof Circle
  color: string
  bgColor: string
}

const columns: ColumnConfig[] = [
  {
    id: "pending",
    title: "To Do",
    icon: Circle,
    color: "text-slate-500",
    bgColor: "bg-slate-50 border-slate-200",
  },
  {
    id: "in-progress",
    title: "In Progress",
    icon: PlayCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-50 border-blue-200",
  },
  {
    id: "completed",
    title: "Completed",
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-50 border-green-200",
  },
]

// Draggable Task Card
function TaskCard({
  task,
  isDragging,
  onClick,
}: {
  task: AssignedTask
  isDragging?: boolean
  onClick?: () => void
}) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    normal: "bg-slate-100 text-slate-700 border-slate-200",
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "completed"

  return (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md",
        isDragging && "opacity-50 shadow-lg rotate-2",
        isOverdue && "border-red-300"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium line-clamp-2">{task.title}</span>
          </div>
          <Badge
            variant="outline"
            className={cn("text-xs flex-shrink-0", priorityColors[task.priority])}
          >
            {task.priority}
          </Badge>
        </div>

        {task.rockTitle && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3 w-3" />
            <span className="truncate">{task.rockTitle}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs",
                isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
              )}
            >
              {isOverdue ? (
                <AlertCircle className="h-3 w-3" />
              ) : (
                <CalendarDays className="h-3 w-3" />
              )}
              <span>
                {new Date(task.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {task.assigneeName && task.type === "assigned" && (
            <span className="text-xs text-muted-foreground truncate">
              {task.assigneeName}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Sortable Task Item
function SortableTaskItem({
  task,
  onClick,
}: {
  task: AssignedTask
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} isDragging={isDragging} onClick={onClick} />
    </div>
  )
}

// Droppable Column
function Column({
  config,
  tasks,
  onTaskClick,
}: {
  config: ColumnConfig
  tasks: AssignedTask[]
  onTaskClick?: (task: AssignedTask) => void
}) {
  const taskIds = tasks.map((t) => t.id)

  return (
    <div className={cn("rounded-xl border p-3", config.bgColor)}>
      <div className="flex items-center gap-2 mb-3">
        <config.icon className={cn("h-5 w-5", config.color)} />
        <h3 className="font-semibold">{config.title}</h3>
        <Badge variant="secondary" className="ml-auto">
          {tasks.length}
        </Badge>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 min-h-[200px]">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              <span>No tasks</span>
            </div>
          ) : (
            tasks.map((task) => (
              <SortableTaskItem
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  )
}

export function KanbanBoard({
  tasks,
  onTaskStatusChange,
  onTaskClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Group tasks by status
  const tasksByColumn = useMemo(() => {
    return {
      pending: tasks.filter((t) => t.status === "pending"),
      "in-progress": tasks.filter((t) => t.status === "in-progress"),
      completed: tasks.filter((t) => t.status === "completed"),
    }
  }, [tasks])

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeId),
    [tasks, activeId]
  )

  const findContainer = (id: string): KanbanColumn | null => {
    // Check if id is a column id
    if (columns.some((c) => c.id === id)) {
      return id as KanbanColumn
    }

    // Find which column contains this task
    for (const [columnId, columnTasks] of Object.entries(tasksByColumn)) {
      if (columnTasks.some((t) => t.id === id)) {
        return columnId as KanbanColumn
      }
    }

    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback if needed
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const activeContainer = findContainer(active.id as string)
    const overContainer = findContainer(over.id as string)

    if (!activeContainer || !overContainer) {
      setActiveId(null)
      return
    }

    // If dropped in a different column, update status
    if (activeContainer !== overContainer) {
      onTaskStatusChange(active.id as string, overContainer as AssignedTask["status"])
    }

    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            config={column}
            tasks={tasksByColumn[column.id]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
