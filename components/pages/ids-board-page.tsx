"use client"

import { useState, useCallback, useMemo } from "react"
import { useIdsBoard } from "@/lib/hooks/use-ids-board"
import { useTeamData } from "@/lib/hooks/use-team-data"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import { IdsBoardKanban } from "@/components/ids-board/ids-board-kanban"
import { IdsBoardItemDialog } from "@/components/ids-board/ids-board-item-dialog"
import { FeatureGate } from "@/components/shared/feature-gate"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Plus, RefreshCw, Search } from "lucide-react"
import type { IdsBoardItem, IdsBoardColumn } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { api } from "@/lib/api/client"

function IdsBoardContent() {
  const { columns, isLoading, error, createItem, updateItem, moveItem, deleteItem, refresh } = useIdsBoard()
  const { teamMembers } = useTeamData()
  const { currentWorkspaceId } = useWorkspaceStore()
  const { currentUser } = useApp()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<IdsBoardItem | null>(null)
  const [defaultColumn, setDefaultColumn] = useState<IdsBoardColumn>("identify")
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "issue" | "rock" | "custom">("all")

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

  const handleConvertToRock = useCallback(async () => {
    if (!editingItem) return
    try {
      await api.rocks.create({
        title: editingItem.title,
        description: editingItem.description || undefined,
        userId: editingItem.assignedTo || undefined,
        workspaceId: currentWorkspaceId || undefined,
      })
      await deleteItem(editingItem.id)
      toast({
        title: "Converted to rock",
        description: `"${editingItem.title}" is now a Rock. Visit the Rocks page to set a due date and track progress.`,
      })
    } catch {
      toast({ title: "Failed to convert to rock", variant: "destructive" })
    }
  }, [editingItem, currentWorkspaceId, deleteItem, toast])

  const handleConvertToTask = useCallback(async () => {
    if (!editingItem) return
    const assigneeId = editingItem.assignedTo || currentUser?.userId || currentUser?.id
    if (!assigneeId) {
      toast({ title: "Cannot create task", description: "No assignee found", variant: "destructive" })
      return
    }
    try {
      await api.tasks.create({
        title: editingItem.title,
        description: editingItem.description || undefined,
        assigneeId,
        workspaceId: currentWorkspaceId || undefined,
      })
      await deleteItem(editingItem.id)
      toast({
        title: "Converted to task",
        description: `"${editingItem.title}" is now a Task. Visit the Tasks page to set a due date and priority.`,
      })
    } catch {
      toast({ title: "Failed to convert to task", variant: "destructive" })
    }
  }, [editingItem, currentUser, currentWorkspaceId, deleteItem, toast])

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

  const filteredColumns = useMemo(() => {
    const filter = (items: IdsBoardItem[]) => {
      let result = items
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        result = result.filter((i) => i.title.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q))
      }
      if (typeFilter !== "all") {
        result = result.filter((i) => i.itemType === typeFilter)
      }
      return result
    }
    return {
      identify: filter(columns.identify),
      discuss: filter(columns.discuss),
      solve: filter(columns.solve),
    }
  }, [columns, searchQuery, typeFilter])

  const isFiltered = searchQuery.trim() !== "" || typeFilter !== "all"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            IDS Board
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-12">
            Identify, Discuss, Solve — work through issues as a team
            {totalItems > 0 && (
              <span className="ml-1 text-xs">({totalItems} items)</span>
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

      {/* Empty state for brand-new boards */}
      {totalItems === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <Search className="h-7 w-7 text-amber-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No issues to solve yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-6">
            The IDS process helps your team Identify issues, Discuss root causes, and Solve with clear action items.
            Add your first issue to get started.
          </p>
          <Button size="sm" onClick={() => handleAddItem("identify")}>
            <Plus className="h-4 w-4 mr-1" />
            Add First Issue
          </Button>
        </div>
      )}

      {/* Search + Type filter */}
      {totalItems > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="h-9 w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="issue">Issues</SelectItem>
              <SelectItem value="rock">Rocks</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {isFiltered && (
            <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearchQuery(""); setTypeFilter("all") }}>
              Clear
            </Button>
          )}
        </div>
      )}

      {/* Polling indicator */}
      <p className="text-xs text-muted-foreground">
        Auto-refreshes every 3s for real-time collaboration
      </p>

      {/* Kanban Board */}
      <IdsBoardKanban
        columns={filteredColumns}
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
        onConvertToRock={editingItem ? handleConvertToRock : undefined}
        onConvertToTask={editingItem ? handleConvertToTask : undefined}
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
