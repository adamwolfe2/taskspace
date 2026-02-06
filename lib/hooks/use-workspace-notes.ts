"use client"

import useSWR from "swr"
import { useCallback, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import type { WorkspaceNote, ApiResponse } from "@/lib/types"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch workspace notes")
  return res.json()
}

export function useWorkspaceNotes() {
  const { currentWorkspace } = useWorkspaces()
  const workspaceId = currentWorkspace?.id
  const savingRef = useRef(false)

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiResponse<WorkspaceNote | null>>(
    workspaceId ? `/api/workspace-notes?workspaceId=${workspaceId}` : null,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30s for collaboration
      revalidateOnFocus: false, // Avoid overwriting local edits on tab focus
    }
  )

  const note = data?.data || null

  const saveNote = useDebouncedCallback(
    async (content: string) => {
      if (!workspaceId || savingRef.current) return
      savingRef.current = true

      try {
        const res = await fetch("/api/workspace-notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, content }),
        })

        if (res.ok) {
          const result = await res.json()
          // Update cache without revalidating (to avoid content flicker)
          mutate({ success: true, data: result.data }, { revalidate: false })
        }
      } finally {
        savingRef.current = false
      }
    },
    2000 // 2 second debounce
  )

  const isSaving = savingRef.current || saveNote.isPending()

  return {
    note,
    isLoading,
    error,
    isSaving,
    saveNote: saveNote as unknown as (content: string) => void,
    refresh: useCallback(() => mutate(), [mutate]),
  }
}
