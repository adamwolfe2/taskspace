"use client"

import { useState, useEffect, useCallback } from "react"
import useSWR from "swr"
import * as Sentry from "@sentry/nextjs"
import type { TeamMember, Rock, AssignedTask, EODReport, Client, Project } from "../types"
import { api } from "../api/client"
import { useApp } from "../contexts/app-context"
import { useWorkspaceStore } from "./use-workspace"
import { getErrorMessage } from "../utils"
import { CONFIG } from "../config"
import { toast } from "@/hooks/use-toast"
import {
  DEMO_TEAM_MEMBERS,
  DEMO_ROCKS,
  DEMO_TASKS,
  DEMO_EOD_REPORTS,
  DEMO_PROJECTS,
  DEMO_CLIENTS,
  DEMO_READONLY_MESSAGE,
} from "../demo-data"

// ============================================
// SWR DATA TYPES AND FETCHER
// ============================================

interface TeamData {
  members: TeamMember[]
  rocks: Rock[]
  tasks: AssignedTask[]
  eodReports: EODReport[]
  projects: Project[]
  clients: Client[]
}

async function teamDataFetcher([, workspaceId]: [string, string]): Promise<TeamData> {
  const [membersData, rocksData, tasksData, reportsData, projectsData, clientsData] = await Promise.all([
    api.members.list(),
    api.rocks.list(undefined, workspaceId),
    api.tasks.list(undefined, undefined, workspaceId),
    api.eodReports.list({ workspaceId }),
    api.projects.list(workspaceId).catch(() => [] as Project[]),
    api.clients.list(workspaceId).catch(() => [] as Client[]),
  ])

  return {
    members: membersData.map(m => ({
      ...m,
      joinDate: m.joinedAt,
      userId: m.userId ?? undefined,
    })),
    rocks: rocksData,
    tasks: tasksData,
    eodReports: reportsData,
    projects: projectsData,
    clients: clientsData,
  }
}

// Helper: show demo mode toast
function showDemoToast() {
  toast({
    title: "Demo Mode",
    description: DEMO_READONLY_MESSAGE,
  })
}

// ============================================
// MAIN HOOK
// ============================================

export function useTeamData() {
  const { isAuthenticated, currentOrganization, isDemoMode } = useApp()
  const { currentWorkspaceId, _hasHydrated } = useWorkspaceStore()

  // Ensure Zustand store is rehydrated
  useEffect(() => {
    if (!_hasHydrated) {
      useWorkspaceStore.persist.rehydrate()
    }
  }, [_hasHydrated])

  // ============================================
  // SWR DATA FETCHING (real mode only)
  // ============================================

  const shouldFetch = !isDemoMode && isAuthenticated && !!currentOrganization && !!currentWorkspaceId && _hasHydrated
  const [crudError, setCrudError] = useState<string | null>(null)

  const { data, error: swrError, isLoading: swrIsLoading, mutate } = useSWR<TeamData>(
    shouldFetch ? ["team-data", currentWorkspaceId] : null,
    teamDataFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: CONFIG.polling.standard, // 60s background polling
      dedupingInterval: 5000,
      onError: (err) => {
        Sentry.captureException(err)
      },
    }
  )

  // ============================================
  // DERIVED VALUES
  // ============================================

  const teamMembers = isDemoMode ? DEMO_TEAM_MEMBERS : (data?.members ?? [])
  const rocks = isDemoMode ? DEMO_ROCKS : (data?.rocks ?? [])
  const assignedTasks = isDemoMode ? DEMO_TASKS : (data?.tasks ?? [])
  const eodReports = isDemoMode ? DEMO_EOD_REPORTS : (data?.eodReports ?? [])
  const projects = isDemoMode ? DEMO_PROJECTS : (data?.projects ?? [])
  const clients = isDemoMode ? DEMO_CLIENTS : (data?.clients ?? [])

  // Loading: SWR first load OR waiting for workspace to be ready
  const isWaitingForWorkspace = !isDemoMode && isAuthenticated && !!currentOrganization && (!currentWorkspaceId || !_hasHydrated)
  const isLoading = isDemoMode ? false : (swrIsLoading || isWaitingForWorkspace)
  const error = isDemoMode ? null : (crudError || (swrError ? getErrorMessage(swrError, "Failed to load data") : null))

  // ============================================
  // STATE SETTERS (no-op in demo mode)
  // ============================================

  const setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>> = useCallback((action) => {
    if (isDemoMode) return
    mutate((prev) => {
      if (!prev) return prev
      const newMembers = typeof action === 'function' ? action(prev.members) : action
      return { ...prev, members: newMembers }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setRocks: React.Dispatch<React.SetStateAction<Rock[]>> = useCallback((action) => {
    if (isDemoMode) return
    mutate((prev) => {
      if (!prev) return prev
      const newRocks = typeof action === 'function' ? action(prev.rocks) : action
      return { ...prev, rocks: newRocks }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setAssignedTasks: React.Dispatch<React.SetStateAction<AssignedTask[]>> = useCallback((action) => {
    if (isDemoMode) return
    mutate((prev) => {
      if (!prev) return prev
      const newTasks = typeof action === 'function' ? action(prev.tasks) : action
      return { ...prev, tasks: newTasks }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setEODReports: React.Dispatch<React.SetStateAction<EODReport[]>> = useCallback((action) => {
    if (isDemoMode) return
    mutate((prev) => {
      if (!prev) return prev
      const newReports = typeof action === 'function' ? action(prev.eodReports) : action
      return { ...prev, eodReports: newReports }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setProjects: React.Dispatch<React.SetStateAction<Project[]>> = useCallback((action) => {
    if (isDemoMode) return
    mutate((prev) => {
      if (!prev) return prev
      const newProjects = typeof action === 'function' ? action(prev.projects) : action
      return { ...prev, projects: newProjects }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setClients: React.Dispatch<React.SetStateAction<Client[]>> = useCallback((action) => {
    if (isDemoMode) return
    mutate((prev) => {
      if (!prev) return prev
      const newClients = typeof action === 'function' ? action(prev.clients) : action
      return { ...prev, clients: newClients }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  // ============================================
  // ROCK OPERATIONS (no-ops in demo mode)
  // ============================================

  const createRock = useCallback(async (rock: Partial<Rock>) => {
    if (isDemoMode) { showDemoToast(); return rock as Rock }
    if (!currentWorkspaceId) {
      const err = new Error("No workspace selected. Please select a workspace to create rock.")
      setCrudError(getErrorMessage(err))
      throw err
    }
    try {
      setCrudError(null)
      const newRock = await api.rocks.create({ ...rock, workspaceId: currentWorkspaceId } as Parameters<typeof api.rocks.create>[0])
      mutate((prev) => prev ? { ...prev, rocks: [...prev.rocks, newRock] } : prev, { revalidate: false })
      return newRock
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId, mutate])

  const updateRock = useCallback(async (id: string, updates: Partial<Rock>) => {
    if (isDemoMode) { showDemoToast(); return { id, ...updates } as Rock }
    try {
      setCrudError(null)
      const updatedRock = await api.rocks.update(id, updates)
      mutate((prev) => prev ? { ...prev, rocks: prev.rocks.map((r) => (r.id === id ? updatedRock : r)) } : prev, { revalidate: false })
      return updatedRock
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  const deleteRock = useCallback(async (id: string) => {
    if (isDemoMode) { showDemoToast(); return }
    try {
      setCrudError(null)
      await api.rocks.delete(id)
      mutate((prev) => prev ? { ...prev, rocks: prev.rocks.filter((r) => r.id !== id) } : prev, { revalidate: false })
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  // ============================================
  // TASK OPERATIONS (no-ops in demo mode)
  // ============================================

  const createTask = useCallback(async (task: Partial<AssignedTask>) => {
    if (isDemoMode) { showDemoToast(); return task as AssignedTask }
    if (!currentWorkspaceId) {
      const err = new Error("No workspace selected. Please select a workspace to create task.")
      setCrudError(getErrorMessage(err))
      throw err
    }
    try {
      setCrudError(null)
      const newTask = await api.tasks.create({ ...task, workspaceId: currentWorkspaceId } as Parameters<typeof api.tasks.create>[0])
      mutate((prev) => prev ? { ...prev, tasks: [...prev.tasks, newTask] } : prev, { revalidate: false })
      return newTask
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId, mutate])

  const updateTask = useCallback(async (id: string, updates: Partial<AssignedTask>) => {
    if (isDemoMode) { showDemoToast(); return { id, ...updates } as AssignedTask }
    try {
      setCrudError(null)
      const updatedTask = await api.tasks.update(id, updates)
      mutate((prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? updatedTask : t)) } : prev, { revalidate: false })
      return updatedTask
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  const deleteTask = useCallback(async (id: string) => {
    if (isDemoMode) { showDemoToast(); return }
    try {
      setCrudError(null)
      await api.tasks.delete(id)
      mutate((prev) => prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== id) } : prev, { revalidate: false })
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  // ============================================
  // EOD REPORT OPERATIONS (no-ops in demo mode)
  // ============================================

  const submitEODReport = useCallback(async (report: Partial<EODReport>) => {
    if (isDemoMode) { showDemoToast(); return report as EODReport }
    if (!currentWorkspaceId) {
      const err = new Error("No workspace selected. Please select a workspace to submit EOD report.")
      setCrudError(getErrorMessage(err))
      throw err
    }
    try {
      setCrudError(null)
      const newReport = await api.eodReports.create({ ...report, workspaceId: currentWorkspaceId } as Parameters<typeof api.eodReports.create>[0])
      mutate((prev) => prev ? { ...prev, eodReports: [newReport, ...prev.eodReports] } : prev, { revalidate: false })
      return newReport
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId, mutate])

  const updateEODReport = useCallback(async (id: string, updates: Partial<EODReport>) => {
    if (isDemoMode) { showDemoToast(); return { id, ...updates } as EODReport }
    try {
      setCrudError(null)
      const updatedReport = await api.eodReports.update(id, updates)
      mutate((prev) => prev ? { ...prev, eodReports: prev.eodReports.map((r) => (r.id === id ? updatedReport : r)) } : prev, { revalidate: false })
      return updatedReport
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  const deleteEODReport = useCallback(async (id: string) => {
    if (isDemoMode) { showDemoToast(); return }
    try {
      setCrudError(null)
      await api.eodReports.delete(id)
      mutate((prev) => prev ? { ...prev, eodReports: prev.eodReports.filter((r) => r.id !== id) } : prev, { revalidate: false })
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  // ============================================
  // MEMBER OPERATIONS (no-ops in demo mode)
  // ============================================

  const updateMember = useCallback(async (memberId: string, updates: Partial<TeamMember>) => {
    if (isDemoMode) { showDemoToast(); return { id: memberId, ...updates } as TeamMember }
    try {
      setCrudError(null)
      const updatedMember = await api.members.update(memberId, updates)
      const mapped = { ...updatedMember, joinDate: updatedMember.joinedAt, userId: updatedMember.userId ?? undefined } as TeamMember
      mutate((prev) => prev ? { ...prev, members: prev.members.map((m) => (m.id === memberId ? mapped : m)) } : prev, { revalidate: false })
      return mapped
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  const removeMember = useCallback(async (memberId: string) => {
    if (isDemoMode) { showDemoToast(); return }
    try {
      setCrudError(null)
      await api.members.remove(memberId)
      mutate((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== memberId) } : prev, { revalidate: false })
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  // ============================================
  // PROJECT OPERATIONS (no-ops in demo mode)
  // ============================================

  const createProject = useCallback(async (project: Partial<Project>) => {
    if (isDemoMode) { showDemoToast(); return project as Project }
    if (!currentWorkspaceId) {
      const err = new Error("No workspace selected.")
      setCrudError(getErrorMessage(err))
      throw err
    }
    try {
      setCrudError(null)
      const newProject = await api.projects.create({ ...project, workspaceId: currentWorkspaceId } as Parameters<typeof api.projects.create>[0])
      mutate((prev) => prev ? { ...prev, projects: [...prev.projects, newProject] } : prev, { revalidate: false })
      return newProject
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId, mutate])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    if (isDemoMode) { showDemoToast(); return { id, ...updates } as Project }
    try {
      setCrudError(null)
      const updatedProject = await api.projects.update(id, updates)
      mutate((prev) => prev ? { ...prev, projects: prev.projects.map((p) => (p.id === id ? updatedProject : p)) } : prev, { revalidate: false })
      return updatedProject
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  const deleteProject = useCallback(async (id: string) => {
    if (isDemoMode) { showDemoToast(); return }
    try {
      setCrudError(null)
      await api.projects.delete(id)
      mutate((prev) => prev ? { ...prev, projects: prev.projects.filter((p) => p.id !== id) } : prev, { revalidate: false })
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  // ============================================
  // CLIENT OPERATIONS (no-ops in demo mode)
  // ============================================

  const createClient = useCallback(async (client: Partial<Client>) => {
    if (isDemoMode) { showDemoToast(); return client as Client }
    if (!currentWorkspaceId) {
      const err = new Error("No workspace selected.")
      setCrudError(getErrorMessage(err))
      throw err
    }
    try {
      setCrudError(null)
      const newClient = await api.clients.create({ ...client, workspaceId: currentWorkspaceId } as Parameters<typeof api.clients.create>[0])
      mutate((prev) => prev ? { ...prev, clients: [...prev.clients, newClient] } : prev, { revalidate: false })
      return newClient
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId, mutate])

  const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
    if (isDemoMode) { showDemoToast(); return { id, ...updates } as Client }
    try {
      setCrudError(null)
      const updatedClient = await api.clients.update(id, updates)
      mutate((prev) => prev ? { ...prev, clients: prev.clients.map((c) => (c.id === id ? updatedClient : c)) } : prev, { revalidate: false })
      return updatedClient
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  const deleteClient = useCallback(async (id: string) => {
    if (isDemoMode) { showDemoToast(); return }
    try {
      setCrudError(null)
      await api.clients.delete(id)
      mutate((prev) => prev ? { ...prev, clients: prev.clients.filter((c) => c.id !== id) } : prev, { revalidate: false })
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, mutate])

  // ============================================
  // UTILITY
  // ============================================

  const refresh = useCallback(async () => {
    if (isDemoMode) return
    await mutate()
  }, [isDemoMode, mutate])

  return {
    // Data
    teamMembers,
    rocks,
    assignedTasks,
    eodReports,
    projects,
    clients,

    // State setters (no-ops in demo mode)
    setTeamMembers,
    setRocks,
    setAssignedTasks,
    setEODReports,
    setProjects,
    setClients,

    // Loading/error state
    isLoading,
    error,

    // Rock operations
    createRock,
    updateRock,
    deleteRock,

    // Task operations
    createTask,
    updateTask,
    deleteTask,

    // EOD Report operations
    submitEODReport,
    updateEODReport,
    deleteEODReport,

    // Project operations
    createProject,
    updateProject,
    deleteProject,

    // Client operations
    createClient,
    updateClient,
    deleteClient,

    // Member operations
    updateMember,
    removeMember,

    // Utility
    refresh,
  }
}
