"use client"

import useSWR from "swr"
import { useCallback } from "react"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import type { IdsBoardItem, IdsBoardColumn, IdsBoardItemType, ApiResponse } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { DEMO_IDS_ITEMS, DEMO_READONLY_MESSAGE } from "@/lib/demo-data"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch IDS board items")
  return res.json()
}

function showDemoToast() {
  toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE })
}

export function useIdsBoard() {
  const { isDemoMode } = useApp()
  const { currentWorkspace } = useWorkspaces()
  const workspaceId = currentWorkspace?.id

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiResponse<IdsBoardItem[]>>(
    !isDemoMode && workspaceId ? `/api/ids-board?workspaceId=${workspaceId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  )

  const items = isDemoMode ? DEMO_IDS_ITEMS : (data?.data || [])

  // Group items by column
  const columns: Record<IdsBoardColumn, IdsBoardItem[]> = {
    identify: items.filter((i) => i.columnName === "identify").sort((a, b) => a.orderIndex - b.orderIndex),
    discuss: items.filter((i) => i.columnName === "discuss").sort((a, b) => a.orderIndex - b.orderIndex),
    solve: items.filter((i) => i.columnName === "solve").sort((a, b) => a.orderIndex - b.orderIndex),
  }

  const createItem = useCallback(
    async (params: {
      title: string
      description?: string
      columnName: IdsBoardColumn
      itemType?: IdsBoardItemType
      assignedTo?: string
    }) => {
      if (isDemoMode) { showDemoToast(); return null }
      if (!workspaceId) return null

      // Optimistic update
      const tempId = "temp_" + Date.now()
      const tempItem: IdsBoardItem = {
        id: tempId,
        workspaceId,
        title: params.title,
        description: params.description,
        columnName: params.columnName,
        orderIndex: columns[params.columnName].length,
        itemType: params.itemType || "custom",
        assignedTo: params.assignedTo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mutate(
        { success: true, data: [...items, tempItem] },
        { revalidate: false }
      )

      const res = await fetch("/api/ids-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...params }),
      })

      const result = await res.json()
      mutate() // Revalidate
      return result.data as IdsBoardItem
    },
    [isDemoMode, workspaceId, items, columns, mutate]
  )

  const updateItem = useCallback(
    async (
      itemId: string,
      updates: { title?: string; description?: string | null; assignedTo?: string | null; itemType?: IdsBoardItemType }
    ) => {
      if (isDemoMode) { showDemoToast(); return null as unknown as IdsBoardItem }

      // Optimistic update - coerce nulls to undefined for type compat
      const safeUpdates: Partial<IdsBoardItem> = {}
      if (updates.title !== undefined) safeUpdates.title = updates.title
      if (updates.description !== undefined) safeUpdates.description = updates.description ?? undefined
      if (updates.assignedTo !== undefined) safeUpdates.assignedTo = updates.assignedTo ?? undefined
      if (updates.itemType !== undefined) safeUpdates.itemType = updates.itemType

      const updatedItems = items.map((i) =>
        i.id === itemId ? { ...i, ...safeUpdates, updatedAt: new Date().toISOString() } : i
      )
      mutate(
        { success: true, data: updatedItems },
        { revalidate: false }
      )

      const res = await fetch(`/api/ids-board/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      const result = await res.json()
      mutate()
      return result.data as IdsBoardItem
    },
    [isDemoMode, items, mutate]
  )

  const moveItem = useCallback(
    async (itemId: string, columnName: IdsBoardColumn, orderIndex: number) => {
      if (isDemoMode) { showDemoToast(); return null as unknown as IdsBoardItem }

      // Optimistic update
      const updatedItems = items.map((i) =>
        i.id === itemId
          ? { ...i, columnName, orderIndex, updatedAt: new Date().toISOString() }
          : i
      )
      mutate(
        { success: true, data: updatedItems },
        { revalidate: false }
      )

      const res = await fetch(`/api/ids-board/${itemId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columnName, orderIndex }),
      })

      const result = await res.json()
      mutate()
      return result.data as IdsBoardItem
    },
    [isDemoMode, items, mutate]
  )

  const deleteItem = useCallback(
    async (itemId: string) => {
      if (isDemoMode) { showDemoToast(); return }

      // Optimistic update
      const updatedItems = items.filter((i) => i.id !== itemId)
      mutate(
        { success: true, data: updatedItems },
        { revalidate: false }
      )

      await fetch(`/api/ids-board/${itemId}`, { method: "DELETE" })
      mutate()
    },
    [isDemoMode, items, mutate]
  )

  return {
    items,
    columns,
    isLoading: isDemoMode ? false : isLoading,
    error: isDemoMode ? null : error,
    createItem,
    updateItem,
    moveItem,
    deleteItem,
    refresh: mutate,
  }
}
