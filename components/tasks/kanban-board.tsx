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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, PlayCircle } from "lucide-react"
import { EnhancedKanbanCard } from "./enhanced-kanban-card"

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

// Draggable Task Card (now using EnhancedKanbanCard)
function TaskCard({
  task,
  isDragging,
  onClick,
}: {
  task: AssignedTask
  isDragging?: boolean
  onClick?: () => void
}) {
  return (
    <EnhancedKanbanCard task={task} isDragging={isDragging} onClick={onClick} />
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

// Droppable Column with enhanced styling
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
    <div className="flex flex-col h-full">
      <div className={cn("rounded-xl border p-4 bg-muted/30 flex flex-col flex-1", config.bgColor)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 rounded-lg bg-background border border-border">
            <config.icon className={cn("h-4 w-4", config.color)} />
          </div>
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {tasks.length}
          </Badge>
        </div>

        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px] sm:min-h-[300px] max-h-[calc(100vh-300px)]">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-sm text-muted-foreground border-2 border-dashed rounded-xl bg-background/50">
                <config.icon className={cn("h-8 w-8 mb-2 opacity-30", config.color)} />
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
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
        <div className="grid grid-cols-[repeat(3,minmax(260px,1fr))] md:grid-cols-3 gap-3 sm:gap-4 min-w-[800px] md:min-w-0">
          {columns.map((column) => (
            <Column
              key={column.id}
              config={column}
              tasks={tasksByColumn[column.id]}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
