"use client"

import useSWR, { mutate as globalMutate } from "swr"
import { useCallback, useMemo } from "react"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import type { TaskPoolItem, ApiResponse } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch task pool")
  return res.json()
}

export function useTaskPool() {
  const { isDemoMode } = useApp()
  const { currentWorkspace } = useWorkspaces()
  const workspaceId = currentWorkspace?.id

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<TaskPoolItem[]>>(
    !isDemoMode && workspaceId ? `/api/task-pool?workspaceId=${workspaceId}` : null,
    fetcher,
    { refreshInterval: 60_000, revalidateOnFocus: true, dedupingInterval: 10000 }
  )

  const tasks = useMemo<TaskPoolItem[]>(() => data?.data || [], [data])

  const addTask = useCallback(
    async (params: { title: string; description?: string; priority?: TaskPoolItem["priority"] }) => {
      if (isDemoMode) {
        toast({ title: "Demo Mode", description: "Task Pool is read-only in demo mode" })
        return null
      }
      if (!workspaceId) return null

      try {
        const res = await fetch("/api/task-pool", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ workspaceId, ...params }),
        })
        const result = await res.json()
        if (!result.success) throw new Error(result.error || "Failed to add task")
        await mutate()
        return result.data as TaskPoolItem
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to add task",
          variant: "destructive",
        })
        return null
      }
    },
    [isDemoMode, workspaceId, mutate]
  )

  const claim = useCallback(
    async (itemId: string) => {
      if (isDemoMode) {
        toast({ title: "Demo Mode", description: "Task Pool is read-only in demo mode" })
        return null
      }
      if (!workspaceId) return null

      // Optimistic: remove the task from the pool immediately (full transfer — it won't exist in pool after claim)
      const snapshot = data
      mutate(
        {
          success: true,
          data: tasks.filter((t) => t.id !== itemId),
        },
        { revalidate: false }
      )

      try {
        const res = await fetch(`/api/task-pool/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ action: "claim", workspaceId }),
        })
        const result = await res.json()
        if (!result.success) {
          mutate(snapshot, { revalidate: false })
          toast({
            title: "Already claimed",
            description: result.error || "This task was just claimed by someone else",
            variant: "destructive",
          })
          return null
        }

        // Revalidate pool (confirms deletion) and team-data (so tasks page shows the new task)
        await mutate()
        await globalMutate((key) => Array.isArray(key) && key[0] === "team-data")

        toast({
          title: "Task claimed",
          description: "Added to your Tasks page",
        })

        return result.data
      } catch {
        mutate(snapshot, { revalidate: false })
        toast({ title: "Error", description: "Failed to claim task", variant: "destructive" })
        return null
      }
    },
    [isDemoMode, workspaceId, tasks, data, mutate]
  )

  const unclaim = useCallback(
    async (itemId: string) => {
      if (isDemoMode) {
        toast({ title: "Demo Mode", description: "Task Pool is read-only in demo mode" })
        return null
      }
      if (!workspaceId) return null

      const snapshot = data
      mutate(
        {
          success: true,
          data: tasks.map((t) =>
            t.id === itemId
              ? { ...t, isClaimedToday: false, claimedById: null, claimedByName: null, claimedAt: null, claimedDate: null }
              : t
          ),
        },
        { revalidate: false }
      )

      try {
        const res = await fetch(`/api/task-pool/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ action: "unclaim", workspaceId }),
        })
        const result = await res.json()
        if (!result.success) {
          mutate(snapshot, { revalidate: false })
          toast({ title: "Error", description: result.error || "Failed to unclaim", variant: "destructive" })
          return null
        }
        await mutate()
        return result.data as TaskPoolItem
      } catch {
        mutate(snapshot, { revalidate: false })
        toast({ title: "Error", description: "Failed to unclaim task", variant: "destructive" })
        return null
      }
    },
    [isDemoMode, workspaceId, tasks, data, mutate]
  )

  const deleteTask = useCallback(
    async (itemId: string) => {
      if (isDemoMode) {
        toast({ title: "Demo Mode", description: "Task Pool is read-only in demo mode" })
        return
      }
      if (!workspaceId) return

      const snapshot = data
      mutate(
        { success: true, data: tasks.filter((t) => t.id !== itemId) },
        { revalidate: false }
      )

      try {
        const res = await fetch(`/api/task-pool/${itemId}?workspaceId=${workspaceId}`, {
          method: "DELETE",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
        const result = await res.json().catch(() => ({ success: false }))
        if (!result.success) {
          mutate(snapshot, { revalidate: false })
          toast({ title: "Error", description: result.error || "Failed to delete task", variant: "destructive" })
          return
        }
        await mutate()
      } catch {
        mutate(snapshot, { revalidate: false })
        toast({ title: "Error", description: "Failed to delete task", variant: "destructive" })
      }
    },
    [isDemoMode, workspaceId, tasks, data, mutate]
  )

  return {
    tasks,
    isLoading: isDemoMode ? false : isLoading,
    error: isDemoMode ? null : error,
    addTask,
    claim,
    unclaim,
    deleteTask,
    refresh: mutate,
  }
}
