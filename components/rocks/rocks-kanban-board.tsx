"use client"

import React, { useState, useMemo } from "react"
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
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { Rock } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Target,
  GripVertical,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Ban,
  TrendingUp,
} from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { ProgressBar } from "@/components/shared/progress-bar"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"

type RockStatus = "on-track" | "at-risk" | "blocked" | "completed"

interface RocksKanbanBoardProps {
  rocks: Rock[]
  onRockStatusChange: (rockId: string, newStatus: Rock["status"]) => void
  onRockClick?: (rock: Rock) => void
}

interface ColumnConfig {
  id: RockStatus
  title: string
  icon: typeof Target
}

const columns: ColumnConfig[] = [
  { id: "on-track", title: "On Track", icon: TrendingUp },
  { id: "at-risk", title: "At Risk", icon: AlertTriangle },
  { id: "blocked", title: "Blocked", icon: Ban },
  { id: "completed", title: "Completed", icon: CheckCircle2 },
]

// Rock Card Component
const RockCard = React.memo(function RockCard({
  rock,
  isDragging,
  onClick,
}: {
  rock: Rock
  isDragging?: boolean
  onClick?: () => void
}) {
  const { getStatusStyle } = useBrandStatusStyles()
  const dueDate = rock.dueDate ? new Date(rock.dueDate) : null
  const isOverdue = dueDate && dueDate < new Date() && rock.status !== "completed"

  return (
    <Card
      className={cn(
        "cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md overflow-hidden",
        isDragging && "opacity-50 shadow-lg scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Top Section */}
        <div className="px-3 py-2.5">
          <div className="flex items-start gap-2 mb-2">
            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <h3 className="text-sm font-semibold leading-tight line-clamp-2 whitespace-pre-wrap break-words">
                  {rock.title}
                </h3>
              </div>
            </div>
          </div>

          {rock.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3 pl-6">
              {rock.description}
            </p>
          )}

          {/* Progress Bar */}
          <div className="pl-6 space-y-1.5">
            <ProgressBar value={rock.progress} size="sm" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{rock.progress}%</span>
            </div>
          </div>
        </div>

        {/* Bottom Section with Metadata */}
        <div className="px-3 py-2 border-t border-dashed border-border bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              {/* Quarter Badge */}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                {rock.quarter || "No Quarter"}
              </Badge>

              {/* Due Date */}
              {dueDate && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 border border-border rounded-sm py-0.5 px-1.5",
                    isOverdue
                      ? "border-red-300 bg-red-100 text-red-700"
                      : "bg-background"
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  <span className="text-[10px] font-medium">
                    {dueDate.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}

              {/* Completion Badge */}
              {rock.status === "completed" && (
                <div
                  className="flex items-center gap-1.5 border rounded-sm py-0.5 px-1.5"
                  style={{
                    backgroundColor: getStatusStyle("completed").backgroundColor,
                    borderColor: getStatusStyle("completed").borderColor,
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" style={{ color: getStatusStyle("completed").color }} />
                  <span className="text-[10px] font-medium" style={{ color: getStatusStyle("completed").color }}>
                    Done
                  </span>
                </div>
              )}
            </div>

            {/* Owner Avatar (if we have user name) */}
            {rock.userName && (
              <Avatar className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-[10px] font-semibold">
                  {rock.userName
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
})

// Sortable Rock Item
const SortableRockItem = React.memo(function SortableRockItem({
  rock,
  onClick,
}: {
  rock: Rock
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rock.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <RockCard rock={rock} isDragging={isDragging} onClick={onClick} />
    </div>
  )
})

// Column Component
const Column = React.memo(function Column({
  config,
  rocks,
  onRockClick,
}: {
  config: ColumnConfig
  rocks: Rock[]
  onRockClick?: (rock: Rock) => void
}) {
  const { getStatusStyle } = useBrandStatusStyles()
  const rockIds = rocks.map((r) => r.id)
  const statusStyle = getStatusStyle(config.id)

  return (
    <div className="flex flex-col h-full">
      <div
        className="rounded-xl border p-4 flex flex-col flex-1"
        style={{
          backgroundColor: statusStyle.backgroundColor,
          borderColor: statusStyle.borderColor,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-1.5 rounded-lg bg-background border border-border">
            <config.icon className="h-4 w-4" style={{ color: statusStyle.color }} />
          </div>
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {rocks.length}
          </Badge>
        </div>

        <SortableContext items={rockIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 flex-1 overflow-y-auto min-h-[300px] max-h-[calc(100vh-300px)]">
            {rocks.length === 0 ? (
              <div className="border-2 border-dashed rounded-xl bg-background/50">
                <EmptyState
                  icon={config.icon}
                  title="No rocks"
                  size="sm"
                />
              </div>
            ) : (
              rocks.map((rock) => (
                <SortableRockItem
                  key={rock.id}
                  rock={rock}
                  onClick={() => onRockClick?.(rock)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
})

export function RocksKanbanBoard({
  rocks,
  onRockStatusChange,
  onRockClick,
}: RocksKanbanBoardProps) {
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

  // Group rocks by status
  const rocksByColumn = useMemo(() => {
    return {
      "on-track": rocks.filter((r) => r.status === "on-track"),
      "at-risk": rocks.filter((r) => r.status === "at-risk"),
      blocked: rocks.filter((r) => r.status === "blocked"),
      completed: rocks.filter((r) => r.status === "completed"),
    }
  }, [rocks])

  const activeRock = useMemo(
    () => rocks.find((r) => r.id === activeId),
    [rocks, activeId]
  )

  const findContainer = (id: string): RockStatus | null => {
    // Check if id is a column id
    if (columns.some((c) => c.id === id)) {
      return id as RockStatus
    }

    // Find which column contains this rock
    for (const [columnId, columnRocks] of Object.entries(rocksByColumn)) {
      if (columnRocks.some((r) => r.id === id)) {
        return columnId as RockStatus
      }
    }

    return null
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
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
      onRockStatusChange(active.id as string, overContainer as Rock["status"])
    }

    setActiveId(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            config={column}
            rocks={rocksByColumn[column.id]}
            onRockClick={onRockClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeRock ? <RockCard rock={activeRock} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
