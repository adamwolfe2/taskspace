"use client"

import { useState, useCallback } from "react"
import { useIdsBoard } from "@/lib/hooks/use-ids-board"
import { useTeamData } from "@/lib/hooks/use-team-data"
import { IdsBoardKanban } from "@/components/ids-board/ids-board-kanban"
import { IdsBoardItemDialog } from "@/components/ids-board/ids-board-item-dialog"
import { FeatureGate } from "@/components/shared/feature-gate"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Plus, RefreshCw, Search } from "lucide-react"
import type { IdsBoardItem, IdsBoardColumn } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { ErrorBoundary } from "@/components/shared/error-boundary"

function IdsBoardContent() {
  const { columns, isLoading, error, createItem, updateItem, moveItem, deleteItem, refresh } = useIdsBoard()
  const { teamMembers } = useTeamData()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<IdsBoardItem | null>(null)
  const [defaultColumn, setDefaultColumn] = useState<IdsBoardColumn>("identify")

  const handleAddItem = useCallback((column: IdsBoardColumn) => {
    setEditingItem(null)
    setDefaultColumn(column)
    setDialogOpen(true)
  }, [])

  const handleEditItem = useCallback((item: IdsBoardItem) => {
    setEditingItem(item)
    setDialogOpen(true)
  }, [])

  const handleSave = useCallback(
    async (data: {
      title: string
      description?: string
      columnName: IdsBoardColumn
      itemType: "issue" | "rock" | "custom"
      assignedTo?: string
    }) => {
      try {
        if (editingItem) {
          await updateItem(editingItem.id, {
            title: data.title,
            description: data.description || null,
            assignedTo: data.assignedTo || null,
            itemType: data.itemType,
          })
          // If column changed, also move
          if (data.columnName !== editingItem.columnName) {
            const targetLength = columns[data.columnName].length
            await moveItem(editingItem.id, data.columnName, targetLength)
          }
          toast({ title: "Item updated" })
        } else {
          await createItem(data)
          toast({ title: "Item added" })
        }
      } catch {
        toast({ title: "Failed to save item", variant: "destructive" })
      }
    },
    [editingItem, createItem, updateItem, moveItem, columns, toast]
  )

  const handleDelete = useCallback(async () => {
    if (!editingItem) return
    try {
      await deleteItem(editingItem.id)
      toast({ title: "Item deleted" })
    } catch {
      toast({ title: "Failed to delete item", variant: "destructive" })
    }
  }, [editingItem, deleteItem, toast])

  const handleMoveItem = useCallback(
    async (itemId: string, columnName: IdsBoardColumn, orderIndex: number) => {
      try {
        await moveItem(itemId, columnName, orderIndex)
      } catch {
        toast({ title: "Failed to move item", variant: "destructive" })
      }
    },
    [moveItem, toast]
  )

  if (isLoading) {
    return (
      <div className="space-y-6 min-h-[400px]">
        {/* Title */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        {/* 3 column skeletons side by side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
        <p className="text-sm">Failed to load IDS board</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refresh()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      </div>
    )
  }

  const totalItems = columns.identify.length + columns.discuss.length + columns.solve.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-6 w-6 text-amber-500" />
            IDS Board
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Identify, Discuss, Solve — work through issues as a team
            {totalItems > 0 && (
              <span className="ml-2 text-xs">({totalItems} items)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => handleAddItem("identify")}>
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Polling indicator */}
      <p className="text-xs text-muted-foreground">
        Auto-refreshes every 3s for real-time collaboration
      </p>

      {/* Kanban Board */}
      <IdsBoardKanban
        columns={columns}
        onMoveItem={handleMoveItem}
        onItemClick={handleEditItem}
        onAddItem={handleAddItem}
        teamMembers={teamMembers}
      />

      {/* Create/Edit Dialog */}
      <IdsBoardItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        defaultColumn={defaultColumn}
        teamMembers={teamMembers}
        onSave={handleSave}
        onDelete={editingItem ? handleDelete : undefined}
      />
    </div>
  )
}

export function IdsBoardPage() {
  return (
    <ErrorBoundary>
    <FeatureGate feature="core.ids">
      <IdsBoardContent />
    </FeatureGate>
    </ErrorBoundary>
  )
}
