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
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { IdsBoardItem, IdsBoardColumn, TeamMember } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Search, MessageCircle, CheckCircle2, Plus } from "lucide-react"
import { IdsBoardCard } from "./ids-board-card"

interface ColumnConfig {
  id: IdsBoardColumn
  title: string
  icon: typeof Search
  color: string
  bgColor: string
  description: string
}

const columnConfigs: ColumnConfig[] = [
  {
    id: "identify",
    title: "Identify",
    icon: Search,
    color: "text-amber-500",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Issues to raise",
  },
  {
    id: "discuss",
    title: "Discuss",
    icon: MessageCircle,
    color: "text-blue-500",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Currently discussing",
  },
  {
    id: "solve",
    title: "Solve",
    icon: CheckCircle2,
    color: "text-green-500",
    bgColor: "bg-green-50 border-green-200",
    description: "Ready to solve",
  },
]

// Sortable Item
function SortableItem({
  item,
  onClick,
}: {
  item: IdsBoardItem
  onClick?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IdsBoardCard item={item} isDragging={isDragging} onClick={onClick} />
    </div>
  )
}

// Column component
function Column({
  config,
  items,
  onItemClick,
  onAddItem,
}: {
  config: ColumnConfig
  items: IdsBoardItem[]
  onItemClick?: (item: IdsBoardItem) => void
  onAddItem?: () => void
}) {
  const itemIds = items.map((i) => i.id)

  return (
    <div className="flex flex-col h-full">
      <div className={cn("rounded-xl border p-4 bg-muted/30 flex flex-col flex-1", config.bgColor)}>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-1.5 rounded-lg bg-background border border-border">
            <config.icon className={cn("h-4 w-4", config.color)} />
          </div>
          <h3 className="font-semibold text-sm">{config.title}</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {items.length}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3 pl-1">{config.description}</p>

        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 flex-1 overflow-y-auto min-h-[200px] sm:min-h-[300px] max-h-[calc(100vh-340px)]">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-sm text-muted-foreground border-2 border-dashed rounded-xl bg-background/50">
                <config.icon className={cn("h-8 w-8 mb-2 opacity-30", config.color)} />
                <span>No items</span>
              </div>
            ) : (
              items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onClick={() => onItemClick?.(item)}
                />
              ))
            )}
          </div>
        </SortableContext>

        {onAddItem && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full border border-dashed text-muted-foreground hover:text-foreground"
            onClick={onAddItem}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add item
          </Button>
        )}
      </div>
    </div>
  )
}

interface IdsBoardKanbanProps {
  columns: Record<IdsBoardColumn, IdsBoardItem[]>
  onMoveItem: (itemId: string, columnName: IdsBoardColumn, orderIndex: number) => void
  onItemClick?: (item: IdsBoardItem) => void
  onAddItem?: (column: IdsBoardColumn) => void
  teamMembers?: TeamMember[]
}

export function IdsBoardKanban({
  columns,
  onMoveItem,
  onItemClick,
  onAddItem,
}: IdsBoardKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const allItems = useMemo(
    () => [...columns.identify, ...columns.discuss, ...columns.solve],
    [columns]
  )

  const activeItem = useMemo(
    () => allItems.find((i) => i.id === activeId),
    [allItems, activeId]
  )

  const findContainer = (id: string): IdsBoardColumn | null => {
    if (columnConfigs.some((c) => c.id === id)) {
      return id as IdsBoardColumn
    }
    for (const [columnId, columnItems] of Object.entries(columns)) {
      if (columnItems.some((i) => i.id === id)) {
        return columnId as IdsBoardColumn
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

    if (activeContainer !== overContainer) {
      // Moved to a different column - place at end
      const targetItems = columns[overContainer]
      onMoveItem(active.id as string, overContainer, targetItems.length)
    } else {
      // Reorder within same column
      const targetItems = columns[overContainer]
      const overIndex = targetItems.findIndex((i) => i.id === over.id)
      if (overIndex >= 0) {
        onMoveItem(active.id as string, overContainer, overIndex)
      }
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
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-2 sm:pb-0">
        <div className="grid grid-cols-[repeat(3,minmax(260px,1fr))] md:grid-cols-3 gap-3 sm:gap-4 min-w-[800px] md:min-w-0">
          {columnConfigs.map((config) => (
            <Column
              key={config.id}
              config={config}
              items={columns[config.id]}
              onItemClick={onItemClick}
              onAddItem={onAddItem ? () => onAddItem(config.id) : undefined}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeItem ? <IdsBoardCard item={activeItem} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  )
}
