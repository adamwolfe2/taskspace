"use client"

import useSWR from "swr"
import { useCallback, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import type { WorkspaceNote, ApiResponse } from "@/lib/types"
import { DEMO_NOTES, DEMO_READONLY_MESSAGE } from "@/lib/demo-data"
import { toast } from "@/hooks/use-toast"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch workspace notes")
  return res.json()
}

export function useWorkspaceNotes() {
  const { isDemoMode } = useApp()
  const { currentWorkspace } = useWorkspaces()
  const workspaceId = currentWorkspace?.id
  const savingRef = useRef(false)

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiResponse<WorkspaceNote | null>>(
    !isDemoMode && workspaceId ? `/api/workspace-notes?workspaceId=${workspaceId}` : null,
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      dedupingInterval: 10000,
    }
  )

  const note = isDemoMode ? DEMO_NOTES : (data?.data || null)

  const saveNote = useDebouncedCallback(
    async (content: string) => {
      if (isDemoMode) {
        toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE })
        return
      }
      if (!workspaceId || savingRef.current) return
      savingRef.current = true

      try {
        const res = await fetch("/api/workspace-notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({ workspaceId, content }),
        })

        if (res.ok) {
          await mutate()
        } else {
          toast({ title: "Save failed", description: "Notes could not be saved. Please try again.", variant: "destructive" })
        }
      } catch {
        toast({ title: "Save failed", description: "Notes could not be saved. Check your connection.", variant: "destructive" })
      } finally {
        savingRef.current = false
      }
    },
    2000
  )

  const isSaving = savingRef.current || saveNote.isPending()

  return {
    note,
    isLoading: isDemoMode ? false : isLoading,
    error: isDemoMode ? null : error,
    isSaving,
    saveNote: saveNote as unknown as (content: string) => void,
    refresh: useCallback(() => mutate(), [mutate]),
  }
}
