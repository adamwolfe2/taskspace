/**
 * Workspace Hooks with Zustand
 *
 * Provides state management for workspace selection and caching.
 * Part of SESSION 5: Multi-Workspace Architecture
 */

"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { useCallback, useEffect, useRef } from "react"
import useSWR from "swr"

// ============================================
// TYPES
// ============================================

export interface Workspace {
  id: string
  organizationId: string
  name: string
  slug: string
  type: "leadership" | "department" | "team" | "project"
  description?: string
  settings: Record<string, unknown>
  isDefault: boolean
  // Workspace-level branding
  logoUrl?: string | null
  primaryColor?: string | null
  secondaryColor?: string | null
  accentColor?: string | null
  faviconUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkspaceWithMemberInfo extends Workspace {
  memberRole: "owner" | "admin" | "member" | "viewer"
  memberCount: number
}

// ============================================
// ZUSTAND STORE
// ============================================

interface WorkspaceState {
  // Current workspace
  currentWorkspaceId: string | null
  currentWorkspace: WorkspaceWithMemberInfo | null

  // Actions
  setCurrentWorkspace: (workspace: WorkspaceWithMemberInfo | null) => void
  setCurrentWorkspaceId: (id: string | null) => void
  clearWorkspace: () => void
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      currentWorkspace: null,

      setCurrentWorkspace: (workspace) =>
        set({
          currentWorkspace: workspace,
          currentWorkspaceId: workspace?.id || null,
        }),

      setCurrentWorkspaceId: (id) =>
        set({
          currentWorkspaceId: id,
        }),

      clearWorkspace: () =>
        set({
          currentWorkspace: null,
          currentWorkspaceId: null,
        }),
    }),
    {
      name: "workspace-storage",
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
      }),
    }
  )
)

// ============================================
// FETCHER
// ============================================

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error("Failed to fetch workspaces")
  const json = await res.json()
  if (!json.success) throw new Error(json.error || "Unknown error")
  return json.data
}

// ============================================
// MAIN HOOK
// ============================================

export function useWorkspaces() {
  const { currentWorkspaceId, currentWorkspace, setCurrentWorkspace, setCurrentWorkspaceId, clearWorkspace } =
    useWorkspaceStore()

  const hasInitialized = useRef(false)

  // Fetch user's workspaces
  const {
    data: workspaces,
    error,
    isLoading,
    mutate,
  } = useSWR<WorkspaceWithMemberInfo[]>("/api/workspaces", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // 30 seconds
  })

  // Auto-select default workspace on initial load
  useEffect(() => {
    if (hasInitialized.current) return
    if (isLoading || !workspaces || workspaces.length === 0) return

    hasInitialized.current = true

    // If we have a stored workspace ID, try to find it
    if (currentWorkspaceId) {
      const storedWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)
      if (storedWorkspace) {
        setCurrentWorkspace(storedWorkspace)
        return
      }
    }

    // Otherwise, select the default workspace
    const defaultWorkspace = workspaces.find((w) => w.isDefault)
    if (defaultWorkspace) {
      setCurrentWorkspace(defaultWorkspace)
    } else if (workspaces.length > 0) {
      // Fallback to first workspace
      setCurrentWorkspace(workspaces[0])
    }
  }, [workspaces, isLoading, currentWorkspaceId, setCurrentWorkspace])

  // Sync current workspace data when workspaces list updates
  useEffect(() => {
    if (!currentWorkspaceId || !workspaces) return

    const updatedWorkspace = workspaces.find((w) => w.id === currentWorkspaceId)
    if (updatedWorkspace && JSON.stringify(updatedWorkspace) !== JSON.stringify(currentWorkspace)) {
      setCurrentWorkspace(updatedWorkspace)
    }
  }, [workspaces, currentWorkspaceId, currentWorkspace, setCurrentWorkspace])

  // Switch workspace
  const switchWorkspace = useCallback(
    (workspaceId: string) => {
      if (!workspaces) return

      const workspace = workspaces.find((w) => w.id === workspaceId)
      if (workspace) {
        setCurrentWorkspace(workspace)
      }
    },
    [workspaces, setCurrentWorkspace]
  )

  // Refresh workspaces
  const refresh = useCallback(() => {
    return mutate()
  }, [mutate])

  return {
    // Data
    workspaces: workspaces || [],
    currentWorkspace,
    currentWorkspaceId,

    // State
    isLoading,
    isError: !!error,
    error,

    // Actions
    switchWorkspace,
    clearWorkspace,
    refresh,

    // Helpers
    isAdmin: currentWorkspace?.memberRole === "admin" || currentWorkspace?.memberRole === "owner",
    isOwner: currentWorkspace?.memberRole === "owner",
  }
}

// ============================================
// WORKSPACE CREATION HOOK
// ============================================

interface CreateWorkspaceParams {
  name: string
  type?: Workspace["type"]
  description?: string
  settings?: Record<string, unknown>
  isDefault?: boolean
}

export function useCreateWorkspace() {
  const { refresh, switchWorkspace } = useWorkspaces()

  const createWorkspace = async (params: CreateWorkspaceParams): Promise<Workspace> => {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    })

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error || "Failed to create workspace")
    }

    const newWorkspace = json.data

    // Refresh workspaces list to include the new workspace
    await refresh()

    // Automatically switch to the newly created workspace
    switchWorkspace(newWorkspace.id)

    return newWorkspace
  }

  return { createWorkspace }
}

// ============================================
// WORKSPACE UPDATE HOOK
// ============================================

interface UpdateWorkspaceParams {
  name?: string
  type?: Workspace["type"]
  description?: string
  settings?: Record<string, unknown>
  isDefault?: boolean
}

export function useUpdateWorkspace() {
  const { refresh, switchWorkspace } = useWorkspaces()

  const updateWorkspace = async (
    workspaceId: string,
    params: UpdateWorkspaceParams
  ): Promise<Workspace> => {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params),
    })

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error || "Failed to update workspace")
    }

    // Refresh workspaces list to get updated data
    await refresh()

    return json.data
  }

  return { updateWorkspace }
}

// ============================================
// WORKSPACE DELETION HOOK
// ============================================

export function useDeleteWorkspace() {
  const { refresh, currentWorkspaceId, workspaces, switchWorkspace } = useWorkspaces()

  const deleteWorkspace = async (workspaceId: string): Promise<void> => {
    const res = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "DELETE",
      credentials: "include",
    })

    const json = await res.json()
    if (!json.success) {
      throw new Error(json.error || "Failed to delete workspace")
    }

    // If we deleted the current workspace, switch to default
    if (currentWorkspaceId === workspaceId) {
      const defaultWorkspace = workspaces.find((w) => w.isDefault && w.id !== workspaceId)
      if (defaultWorkspace) {
        switchWorkspace(defaultWorkspace.id)
      }
    }

    // Refresh workspaces list
    await refresh()
  }

  return { deleteWorkspace }
}

// ============================================
// WORKSPACE DETAILS HOOK
// ============================================

interface WorkspaceDetails {
  workspace: Workspace
  members: Array<{
    id: string
    workspaceId: string
    userId: string
    role: "owner" | "admin" | "member" | "viewer"
    joinedAt: string
    userName?: string
    userEmail?: string
  }>
  memberRole: "owner" | "admin" | "member" | "viewer" | null
}

export function useWorkspaceDetails(workspaceId: string | null) {
  const {
    data: details,
    error,
    isLoading,
    mutate,
  } = useSWR<WorkspaceDetails>(
    workspaceId ? `/api/workspaces/${workspaceId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    details,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

// ============================================
// HELPER TYPES FOR ICONS
// ============================================

export const WORKSPACE_TYPE_ICONS = {
  leadership: "Briefcase",
  department: "Building2",
  team: "Users",
  project: "Folder",
} as const

export type WorkspaceTypeIcon = typeof WORKSPACE_TYPE_ICONS[keyof typeof WORKSPACE_TYPE_ICONS]
