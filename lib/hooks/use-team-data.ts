"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import useSWR from "swr"
import * as Sentry from "@sentry/nextjs"
import type { TeamMember, Rock, AssignedTask, EODReport, Client, Project } from "../types"
import { api } from "../api/client"
import { useApp } from "../contexts/app-context"
import { useWorkspaceStore } from "./use-workspace"
import { getErrorMessage } from "../utils"
import { CONFIG } from "../config"

// Demo data for the demo mode
// Use local timezone for date strings to match EOD report format
function getLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Compute dates dynamically to avoid hydration mismatch
function getDemoDates() {
  return {
    today: getLocalDateString(new Date()),
    yesterday: getLocalDateString(new Date(Date.now() - 86400000))
  }
}

// LocalStorage keys for demo mode data persistence
const DEMO_STORAGE_KEYS = {
  teamMembers: "aims_demo_team_members",
  rocks: "aims_demo_rocks",
  tasks: "aims_demo_tasks",
  eodReports: "aims_demo_eod_reports",
  projects: "aims_demo_projects",
  clients: "aims_demo_clients",
  lastSaved: "aims_demo_last_saved",
}

// Helper to safely load from localStorage
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // localStorage read failure is non-critical; fall through to fallback
  }
  return fallback
}

// Helper to safely save to localStorage
function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(data))
    localStorage.setItem(DEMO_STORAGE_KEYS.lastSaved, new Date().toISOString())
  } catch {
    // localStorage write failure is non-critical in demo mode
  }
}

// Generate demo data with current dates (called at runtime, not module load)
function getDemoTeamMembers(): TeamMember[] {
  return [
    { id: "demo-user-1", name: "Adam Wolfe", email: "adam@demo.com", role: "admin", department: "Operations", joinDate: "2024-01-15", status: "active" },
    { id: "demo-user-2", name: "Sarah Chen", email: "sarah@demo.com", role: "member", department: "Property Management", joinDate: "2024-02-01", status: "active" },
    { id: "demo-user-3", name: "Mike Johnson", email: "mike@demo.com", role: "member", department: "Maintenance", joinDate: "2024-02-15", status: "active" },
    { id: "demo-user-4", name: "Lisa Park", email: "lisa@demo.com", role: "member", department: "Leasing", joinDate: "2024-03-01", status: "active" },
  ]
}

function getDemoRocks(): Rock[] {
  const { today } = getDemoDates()
  return [
    { id: "rock-1", userId: "demo-user-2", organizationId: "demo-org-1", title: "Complete Q1 property inspections", description: "Inspect all 50 properties by end of quarter", progress: 72, status: "on-track", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
    { id: "rock-2", userId: "demo-user-3", organizationId: "demo-org-1", title: "Reduce maintenance backlog by 40%", description: "Clear outstanding maintenance tickets", progress: 45, status: "at-risk", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
    { id: "rock-3", userId: "demo-user-4", organizationId: "demo-org-1", title: "Achieve 95% occupancy rate", description: "Fill vacant units across portfolio", progress: 88, status: "on-track", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
    { id: "rock-4", userId: "demo-user-1", organizationId: "demo-org-1", title: "Implement new property management software", description: "Roll out and train team on new system", progress: 60, status: "on-track", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
  ]
}

function getDemoTasks(): AssignedTask[] {
  const { today, yesterday } = getDemoDates()
  return [
    { id: "task-1", organizationId: "demo-org-1", title: "Review vendor contracts", description: "Annual review of all vendor agreements", assigneeId: "demo-user-2", assigneeName: "Sarah Chen", assignedById: "demo-user-1", assignedByName: "Adam Wolfe", type: "assigned", rockId: null, rockTitle: null, priority: "high", dueDate: today, status: "pending", completedAt: null, addedToEOD: false, eodReportId: null, createdAt: yesterday, updatedAt: yesterday },
    { id: "task-2", organizationId: "demo-org-1", title: "Fix HVAC unit at 123 Main St", description: "Unit 4B reported heating issues", assigneeId: "demo-user-3", assigneeName: "Mike Johnson", assignedById: "demo-user-1", assignedByName: "Adam Wolfe", type: "assigned", rockId: "rock-2", rockTitle: "Reduce maintenance backlog by 40%", priority: "high", dueDate: today, status: "in-progress", completedAt: null, addedToEOD: false, eodReportId: null, createdAt: yesterday, updatedAt: today },
    { id: "task-3", organizationId: "demo-org-1", title: "Schedule property tours for prospects", description: "3 prospects interested in 2BR units", assigneeId: "demo-user-4", assigneeName: "Lisa Park", assignedById: "demo-user-1", assignedByName: "Adam Wolfe", type: "assigned", rockId: "rock-3", rockTitle: "Achieve 95% occupancy rate", priority: "medium", dueDate: today, status: "pending", completedAt: null, addedToEOD: false, eodReportId: null, createdAt: yesterday, updatedAt: yesterday },
  ]
}

function getDemoEODReports(): EODReport[] {
  const { yesterday } = getDemoDates()
  return [
  {
    id: "eod-1",
    organizationId: "demo-org-1",
    userId: "demo-user-2",
    date: yesterday,
    tasks: [
      { id: "t1", text: "Completed inspections for 5 properties", rockId: "rock-1", rockTitle: "Complete Q1 property inspections" },
      { id: "t2", text: "Updated tenant records in database", rockId: null, rockTitle: null },
      { id: "t3", text: "Coordinated with maintenance on urgent repairs", rockId: null, rockTitle: null },
    ],
    challenges: "Scheduling conflicts with some tenants for inspections",
    tomorrowPriorities: [
      { id: "p1", text: "Continue property inspections - target 3 more", rockId: "rock-1", rockTitle: "Complete Q1 property inspections" },
      { id: "p2", text: "Follow up with tenants who missed appointments", rockId: null, rockTitle: null },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: yesterday,
    createdAt: yesterday,
  },
  {
    id: "eod-2",
    organizationId: "demo-org-1",
    userId: "demo-user-3",
    date: yesterday,
    tasks: [
      { id: "t4", text: "Repaired plumbing issue at 456 Oak Ave", rockId: "rock-2", rockTitle: "Reduce maintenance backlog by 40%" },
      { id: "t5", text: "Completed 3 routine maintenance tickets", rockId: "rock-2", rockTitle: "Reduce maintenance backlog by 40%" },
    ],
    challenges: "Waiting on parts for HVAC repair at 123 Main St - vendor delayed",
    tomorrowPriorities: [
      { id: "p3", text: "Follow up on HVAC parts delivery", rockId: null, rockTitle: null },
      { id: "p4", text: "Address emergency tickets first thing", rockId: null, rockTitle: null },
    ],
    needsEscalation: true,
    escalationNote: "HVAC parts delayed by 2 weeks - tenant without heat. Need to find alternative solution.",
    metricValueToday: null,
    submittedAt: yesterday,
    createdAt: yesterday,
  },
  {
    id: "eod-3",
    organizationId: "demo-org-1",
    userId: "demo-user-4",
    date: yesterday,
    tasks: [
      { id: "t6", text: "Showed 4 units to prospective tenants", rockId: "rock-3", rockTitle: "Achieve 95% occupancy rate" },
      { id: "t7", text: "Processed 2 lease applications", rockId: "rock-3", rockTitle: "Achieve 95% occupancy rate" },
      { id: "t8", text: "Updated listing photos for vacant units", rockId: null, rockTitle: null },
    ],
    challenges: "",
    tomorrowPriorities: [
      { id: "p5", text: "Follow up with applicants on approval status", rockId: null, rockTitle: null },
      { id: "p6", text: "Schedule tours for new prospects", rockId: "rock-3", rockTitle: "Achieve 95% occupancy rate" },
    ],
    needsEscalation: false,
    escalationNote: null,
    metricValueToday: null,
    submittedAt: yesterday,
    createdAt: yesterday,
  },
  ]
}

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

function getDemoClients(): Client[] {
  return [
    { id: "client-1", organizationId: "demo-org-1", workspaceId: "demo-ws-1", name: "Acme Properties", status: "active", contactName: "John Doe", contactEmail: "john@acme.com", industry: "Real Estate", tags: [], customFields: {}, createdAt: "2024-01-15", updatedAt: "2024-01-15" },
    { id: "client-2", organizationId: "demo-org-1", workspaceId: "demo-ws-1", name: "Sunrise Development", status: "active", contactName: "Jane Smith", contactEmail: "jane@sunrise.com", industry: "Construction", tags: [], customFields: {}, createdAt: "2024-02-01", updatedAt: "2024-02-01" },
  ]
}

function getDemoProjects(): Project[] {
  return [
    { id: "proj-1", organizationId: "demo-org-1", workspaceId: "demo-ws-1", clientId: "client-1", clientName: "Acme Properties", name: "Q1 Renovations", status: "active", priority: "high", progress: 45, tags: [], customFields: {}, createdAt: "2024-01-20", updatedAt: "2024-01-20" },
    { id: "proj-2", organizationId: "demo-org-1", workspaceId: "demo-ws-1", clientId: "client-2", clientName: "Sunrise Development", name: "New Construction - Lot 14", status: "planning", priority: "medium", progress: 10, tags: [], customFields: {}, createdAt: "2024-02-10", updatedAt: "2024-02-10" },
    { id: "proj-3", organizationId: "demo-org-1", workspaceId: "demo-ws-1", clientId: null, name: "Internal Process Improvement", status: "active", priority: "normal", progress: 70, tags: [], customFields: {}, createdAt: "2024-01-05", updatedAt: "2024-01-05" },
  ]
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
  // DEMO MODE STATE
  // ============================================

  const [demoMembers, setDemoMembers] = useState<TeamMember[]>([])
  const [demoRocks, setDemoRocks] = useState<Rock[]>([])
  const [demoTasks, setDemoTasks] = useState<AssignedTask[]>([])
  const [demoReports, setDemoReports] = useState<EODReport[]>([])
  const [demoProjects, setDemoProjects] = useState<Project[]>([])
  const [demoClients, setDemoClients] = useState<Client[]>([])
  const [demoLoading, setDemoLoading] = useState(true)
  const initialLoadComplete = useRef(false)

  // Initialize demo data from localStorage or defaults
  useEffect(() => {
    if (!isDemoMode) return
    setDemoMembers(loadFromStorage(DEMO_STORAGE_KEYS.teamMembers, getDemoTeamMembers()))
    setDemoRocks(loadFromStorage(DEMO_STORAGE_KEYS.rocks, getDemoRocks()))
    setDemoTasks(loadFromStorage(DEMO_STORAGE_KEYS.tasks, getDemoTasks()))
    setDemoReports(loadFromStorage(DEMO_STORAGE_KEYS.eodReports, getDemoEODReports()))
    setDemoProjects(loadFromStorage(DEMO_STORAGE_KEYS.projects, getDemoProjects()))
    setDemoClients(loadFromStorage(DEMO_STORAGE_KEYS.clients, getDemoClients()))
    setDemoLoading(false)
    setTimeout(() => { initialLoadComplete.current = true }, 100)
  }, [isDemoMode])

  // Auto-save demo data to localStorage
  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current && demoMembers.length > 0)
      saveToStorage(DEMO_STORAGE_KEYS.teamMembers, demoMembers)
  }, [isDemoMode, demoMembers])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current)
      saveToStorage(DEMO_STORAGE_KEYS.rocks, demoRocks)
  }, [isDemoMode, demoRocks])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current)
      saveToStorage(DEMO_STORAGE_KEYS.tasks, demoTasks)
  }, [isDemoMode, demoTasks])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current)
      saveToStorage(DEMO_STORAGE_KEYS.eodReports, demoReports)
  }, [isDemoMode, demoReports])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current)
      saveToStorage(DEMO_STORAGE_KEYS.projects, demoProjects)
  }, [isDemoMode, demoProjects])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current)
      saveToStorage(DEMO_STORAGE_KEYS.clients, demoClients)
  }, [isDemoMode, demoClients])

  // ============================================
  // SWR DATA FETCHING (real mode)
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
        console.error("Failed to load team data:", err)
        Sentry.captureException(err)
      },
    }
  )

  // ============================================
  // DERIVED VALUES
  // ============================================

  const teamMembers = isDemoMode ? demoMembers : (data?.members ?? [])
  const rocks = isDemoMode ? demoRocks : (data?.rocks ?? [])
  const assignedTasks = isDemoMode ? demoTasks : (data?.tasks ?? [])
  const eodReports = isDemoMode ? demoReports : (data?.eodReports ?? [])
  const projects = isDemoMode ? demoProjects : (data?.projects ?? [])
  const clients = isDemoMode ? demoClients : (data?.clients ?? [])

  // Loading: SWR first load OR waiting for workspace to be ready
  const isWaitingForWorkspace = !isDemoMode && isAuthenticated && !!currentOrganization && (!currentWorkspaceId || !_hasHydrated)
  const isLoading = isDemoMode ? demoLoading : (swrIsLoading || isWaitingForWorkspace)
  const error = isDemoMode ? null : (crudError || (swrError ? getErrorMessage(swrError, "Failed to load data") : null))

  // ============================================
  // STATE SETTERS (for consuming component compatibility)
  // ============================================

  const setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>> = useCallback((action) => {
    if (isDemoMode) { setDemoMembers(action); return }
    mutate((prev) => {
      if (!prev) return prev
      const newMembers = typeof action === 'function' ? action(prev.members) : action
      return { ...prev, members: newMembers }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setRocks: React.Dispatch<React.SetStateAction<Rock[]>> = useCallback((action) => {
    if (isDemoMode) { setDemoRocks(action); return }
    mutate((prev) => {
      if (!prev) return prev
      const newRocks = typeof action === 'function' ? action(prev.rocks) : action
      return { ...prev, rocks: newRocks }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setAssignedTasks: React.Dispatch<React.SetStateAction<AssignedTask[]>> = useCallback((action) => {
    if (isDemoMode) { setDemoTasks(action); return }
    mutate((prev) => {
      if (!prev) return prev
      const newTasks = typeof action === 'function' ? action(prev.tasks) : action
      return { ...prev, tasks: newTasks }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setEODReports: React.Dispatch<React.SetStateAction<EODReport[]>> = useCallback((action) => {
    if (isDemoMode) { setDemoReports(action); return }
    mutate((prev) => {
      if (!prev) return prev
      const newReports = typeof action === 'function' ? action(prev.eodReports) : action
      return { ...prev, eodReports: newReports }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setProjects: React.Dispatch<React.SetStateAction<Project[]>> = useCallback((action) => {
    if (isDemoMode) { setDemoProjects(action); return }
    mutate((prev) => {
      if (!prev) return prev
      const newProjects = typeof action === 'function' ? action(prev.projects) : action
      return { ...prev, projects: newProjects }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  const setClients: React.Dispatch<React.SetStateAction<Client[]>> = useCallback((action) => {
    if (isDemoMode) { setDemoClients(action); return }
    mutate((prev) => {
      if (!prev) return prev
      const newClients = typeof action === 'function' ? action(prev.clients) : action
      return { ...prev, clients: newClients }
    }, { revalidate: false })
  }, [isDemoMode, mutate])

  // ============================================
  // ROCK OPERATIONS
  // ============================================

  const createRock = useCallback(async (rock: Partial<Rock>) => {
    if (isDemoMode) {
      const newRock = { ...rock, id: `rock-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Rock
      setDemoRocks((prev) => [...prev, newRock])
      return newRock
    }
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
    if (isDemoMode) {
      const updatedRock = rocks.find(r => r.id === id)
      if (updatedRock) {
        const updated = { ...updatedRock, ...updates, updatedAt: new Date().toISOString() }
        setDemoRocks((prev) => prev.map((r) => (r.id === id ? updated : r)))
        return updated
      }
      throw new Error("Rock not found")
    }
    try {
      setCrudError(null)
      const updatedRock = await api.rocks.update(id, updates)
      mutate((prev) => prev ? { ...prev, rocks: prev.rocks.map((r) => (r.id === id ? updatedRock : r)) } : prev, { revalidate: false })
      return updatedRock
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, rocks, mutate])

  const deleteRock = useCallback(async (id: string) => {
    if (isDemoMode) {
      setDemoRocks((prev) => prev.filter((r) => r.id !== id))
      return
    }
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
  // TASK OPERATIONS
  // ============================================

  const createTask = useCallback(async (task: Partial<AssignedTask>) => {
    if (isDemoMode) {
      const newTask = { ...task, id: `task-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as AssignedTask
      setDemoTasks((prev) => [...prev, newTask])
      return newTask
    }
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
    if (isDemoMode) {
      const existingTask = assignedTasks.find(t => t.id === id)
      if (existingTask) {
        const updated = { ...existingTask, ...updates, updatedAt: new Date().toISOString() }
        setDemoTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
        return updated
      }
      throw new Error("Task not found")
    }
    try {
      setCrudError(null)
      const updatedTask = await api.tasks.update(id, updates)
      mutate((prev) => prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === id ? updatedTask : t)) } : prev, { revalidate: false })
      return updatedTask
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, assignedTasks, mutate])

  const deleteTask = useCallback(async (id: string) => {
    if (isDemoMode) {
      setDemoTasks((prev) => prev.filter((t) => t.id !== id))
      return
    }
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
  // EOD REPORT OPERATIONS
  // ============================================

  const submitEODReport = useCallback(async (report: Partial<EODReport>) => {
    if (isDemoMode) {
      const newReport = { ...report, id: `eod-${Date.now()}`, createdAt: new Date().toISOString() } as EODReport
      setDemoReports((prev) => [newReport, ...prev])
      return newReport
    }
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
    if (isDemoMode) {
      const existingReport = eodReports.find(r => r.id === id)
      if (existingReport) {
        const updated = { ...existingReport, ...updates }
        setDemoReports((prev) => prev.map((r) => (r.id === id ? updated : r)))
        return updated
      }
      throw new Error("Report not found")
    }
    try {
      setCrudError(null)
      const updatedReport = await api.eodReports.update(id, updates)
      mutate((prev) => prev ? { ...prev, eodReports: prev.eodReports.map((r) => (r.id === id ? updatedReport : r)) } : prev, { revalidate: false })
      return updatedReport
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, eodReports, mutate])

  const deleteEODReport = useCallback(async (id: string) => {
    if (isDemoMode) {
      setDemoReports((prev) => prev.filter((r) => r.id !== id))
      return
    }
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
  // MEMBER OPERATIONS
  // ============================================

  const updateMember = useCallback(async (memberId: string, updates: Partial<TeamMember>) => {
    if (isDemoMode) {
      const existingMember = teamMembers.find(m => m.id === memberId)
      if (existingMember) {
        const updated = { ...existingMember, ...updates }
        setDemoMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)))
        return updated
      }
      throw new Error("Member not found")
    }
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
  }, [isDemoMode, teamMembers, mutate])

  const removeMember = useCallback(async (memberId: string) => {
    if (isDemoMode) {
      setDemoMembers((prev) => prev.filter((m) => m.id !== memberId))
      return
    }
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
  // PROJECT OPERATIONS
  // ============================================

  const createProject = useCallback(async (project: Partial<Project>) => {
    if (isDemoMode) {
      const newProject = { ...project, id: `proj-${Date.now()}`, progress: project.progress ?? 0, tags: project.tags ?? [], customFields: project.customFields ?? {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Project
      setDemoProjects((prev) => [...prev, newProject])
      return newProject
    }
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
    if (isDemoMode) {
      const existing = projects.find(p => p.id === id)
      if (existing) {
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
        setDemoProjects((prev) => prev.map((p) => (p.id === id ? updated : p)))
        return updated
      }
      throw new Error("Project not found")
    }
    try {
      setCrudError(null)
      const updatedProject = await api.projects.update(id, updates)
      mutate((prev) => prev ? { ...prev, projects: prev.projects.map((p) => (p.id === id ? updatedProject : p)) } : prev, { revalidate: false })
      return updatedProject
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, projects, mutate])

  const deleteProject = useCallback(async (id: string) => {
    if (isDemoMode) {
      setDemoProjects((prev) => prev.filter((p) => p.id !== id))
      return
    }
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
  // CLIENT OPERATIONS
  // ============================================

  const createClient = useCallback(async (client: Partial<Client>) => {
    if (isDemoMode) {
      const newClient = { ...client, id: `cli-${Date.now()}`, tags: client.tags ?? [], customFields: client.customFields ?? {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Client
      setDemoClients((prev) => [...prev, newClient])
      return newClient
    }
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
    if (isDemoMode) {
      const existing = clients.find(c => c.id === id)
      if (existing) {
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
        setDemoClients((prev) => prev.map((c) => (c.id === id ? updated : c)))
        return updated
      }
      throw new Error("Client not found")
    }
    try {
      setCrudError(null)
      const updatedClient = await api.clients.update(id, updates)
      mutate((prev) => prev ? { ...prev, clients: prev.clients.map((c) => (c.id === id ? updatedClient : c)) } : prev, { revalidate: false })
      return updatedClient
    } catch (err: unknown) {
      setCrudError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, clients, mutate])

  const deleteClient = useCallback(async (id: string) => {
    if (isDemoMode) {
      setDemoClients((prev) => prev.filter((c) => c.id !== id))
      return
    }
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

  // Reset demo data to defaults (clears localStorage)
  const resetDemoData = useCallback(() => {
    if (!isDemoMode) return

    // Clear localStorage
    Object.values(DEMO_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })

    // Reset to default demo data
    setDemoMembers(getDemoTeamMembers())
    setDemoRocks(getDemoRocks())
    setDemoTasks(getDemoTasks())
    setDemoReports(getDemoEODReports())
    setDemoProjects(getDemoProjects())
    setDemoClients(getDemoClients())

    // Reset the initialLoadComplete flag to prevent immediate re-saving
    initialLoadComplete.current = false
    setTimeout(() => {
      initialLoadComplete.current = true
    }, 100)
  }, [isDemoMode])

  // Get demo data last saved timestamp
  const getDemoDataLastSaved = useCallback((): string | null => {
    if (!isDemoMode || typeof window === "undefined") return null
    return localStorage.getItem(DEMO_STORAGE_KEYS.lastSaved)
  }, [isDemoMode])

  return {
    // Data
    teamMembers,
    rocks,
    assignedTasks,
    eodReports,
    projects,
    clients,

    // State setters (for compatibility with existing components)
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

    // Demo mode utilities
    resetDemoData,
    getDemoDataLastSaved,
  }
}
