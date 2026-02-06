"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { TeamMember, Rock, AssignedTask, EODReport } from "../types"
import { api } from "../api/client"
import { useApp } from "../contexts/app-context"
import { useWorkspaceStore } from "./use-workspace"
import { getErrorMessage } from "../utils"

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
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error)
  }
  return fallback
}

// Helper to safely save to localStorage
function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(data))
    localStorage.setItem(DEMO_STORAGE_KEYS.lastSaved, new Date().toISOString())
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error)
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

export function useTeamData() {
  const { isAuthenticated, currentOrganization, isDemoMode } = useApp()
  const { currentWorkspaceId } = useWorkspaceStore()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [rocks, setRocks] = useState<Rock[]>([])
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([])
  const [eodReports, setEODReports] = useState<EODReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track if initial load is complete to prevent saving defaults back to storage
  const initialLoadComplete = useRef(false)

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !currentOrganization) {
      setIsLoading(false)
      return
    }

    // Use demo data in demo mode - load from localStorage if available, fallback to defaults
    if (isDemoMode) {
      const savedMembers = loadFromStorage<TeamMember[]>(DEMO_STORAGE_KEYS.teamMembers, getDemoTeamMembers())
      const savedRocks = loadFromStorage<Rock[]>(DEMO_STORAGE_KEYS.rocks, getDemoRocks())
      const savedTasks = loadFromStorage<AssignedTask[]>(DEMO_STORAGE_KEYS.tasks, getDemoTasks())
      const savedReports = loadFromStorage<EODReport[]>(DEMO_STORAGE_KEYS.eodReports, getDemoEODReports())

      setTeamMembers(savedMembers)
      setRocks(savedRocks)
      setAssignedTasks(savedTasks)
      setEODReports(savedReports)
      setIsLoading(false)

      // Mark initial load as complete after a small delay to allow state to settle
      setTimeout(() => {
        initialLoadComplete.current = true
      }, 100)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [membersData, rocksData, tasksData, reportsData] = await Promise.all([
        api.members.list(),
        api.rocks.list(undefined, currentWorkspaceId || undefined),
        api.tasks.list(undefined, undefined, currentWorkspaceId || undefined),
        api.eodReports.list(currentWorkspaceId ? { workspaceId: currentWorkspaceId } : undefined),
      ])

      setTeamMembers(membersData.map(m => ({
        ...m,
        joinDate: m.joinedAt,
        userId: m.userId ?? undefined,
      })))
      setRocks(rocksData)
      setAssignedTasks(tasksData)
      setEODReports(reportsData)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to load data"))
      console.error("Failed to load team data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, currentOrganization, isDemoMode, currentWorkspaceId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-save demo mode data to localStorage whenever it changes
  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current && teamMembers.length > 0) {
      saveToStorage(DEMO_STORAGE_KEYS.teamMembers, teamMembers)
    }
  }, [isDemoMode, teamMembers])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current) {
      saveToStorage(DEMO_STORAGE_KEYS.rocks, rocks)
    }
  }, [isDemoMode, rocks])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current) {
      saveToStorage(DEMO_STORAGE_KEYS.tasks, assignedTasks)
    }
  }, [isDemoMode, assignedTasks])

  useEffect(() => {
    if (isDemoMode && initialLoadComplete.current) {
      saveToStorage(DEMO_STORAGE_KEYS.eodReports, eodReports)
    }
  }, [isDemoMode, eodReports])

  // Rock operations
  const createRock = useCallback(async (rock: Partial<Rock>) => {
    if (isDemoMode) {
      const newRock = { ...rock, id: `rock-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Rock
      setRocks((prev) => [...prev, newRock])
      return newRock
    }
    // CRITICAL: Workspace is required for data isolation
    if (!currentWorkspaceId) {
      const error = new Error("No workspace selected. Please select a workspace to create rock.")
      setError(getErrorMessage(error))
      throw error
    }
    try {
      const rockWithWorkspace = {
        ...rock,
        workspaceId: currentWorkspaceId,
      }
      const newRock = await api.rocks.create(rockWithWorkspace as Parameters<typeof api.rocks.create>[0])
      setRocks((prev) => [...prev, newRock])
      return newRock
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId])

  const updateRock = useCallback(async (id: string, updates: Partial<Rock>) => {
    if (isDemoMode) {
      const updatedRock = rocks.find(r => r.id === id)
      if (updatedRock) {
        const updated = { ...updatedRock, ...updates, updatedAt: new Date().toISOString() }
        setRocks((prev) => prev.map((r) => (r.id === id ? updated : r)))
        return updated
      }
      throw new Error("Rock not found")
    }
    try {
      const updatedRock = await api.rocks.update(id, updates)
      setRocks((prev) => prev.map((r) => (r.id === id ? updatedRock : r)))
      return updatedRock
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, rocks])

  const deleteRock = useCallback(async (id: string) => {
    if (isDemoMode) {
      setRocks((prev) => prev.filter((r) => r.id !== id))
      return
    }
    try {
      await api.rocks.delete(id)
      setRocks((prev) => prev.filter((r) => r.id !== id))
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode])

  // Task operations
  const createTask = useCallback(async (task: Partial<AssignedTask>) => {
    if (isDemoMode) {
      const newTask = { ...task, id: `task-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as AssignedTask
      setAssignedTasks((prev) => [...prev, newTask])
      return newTask
    }
    // CRITICAL: Workspace is required for data isolation
    if (!currentWorkspaceId) {
      const error = new Error("No workspace selected. Please select a workspace to create task.")
      setError(getErrorMessage(error))
      throw error
    }
    try {
      const taskWithWorkspace = {
        ...task,
        workspaceId: currentWorkspaceId,
      }
      const newTask = await api.tasks.create(taskWithWorkspace as Parameters<typeof api.tasks.create>[0])
      setAssignedTasks((prev) => [...prev, newTask])
      return newTask
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId])

  const updateTask = useCallback(async (id: string, updates: Partial<AssignedTask>) => {
    if (isDemoMode) {
      const existingTask = assignedTasks.find(t => t.id === id)
      if (existingTask) {
        const updated = { ...existingTask, ...updates, updatedAt: new Date().toISOString() }
        setAssignedTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
        return updated
      }
      throw new Error("Task not found")
    }
    try {
      const updatedTask = await api.tasks.update(id, updates)
      setAssignedTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))
      return updatedTask
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, assignedTasks])

  const deleteTask = useCallback(async (id: string) => {
    if (isDemoMode) {
      setAssignedTasks((prev) => prev.filter((t) => t.id !== id))
      return
    }
    try {
      await api.tasks.delete(id)
      setAssignedTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode])

  // EOD Report operations
  const submitEODReport = useCallback(async (report: Partial<EODReport>) => {
    if (isDemoMode) {
      const newReport = { ...report, id: `eod-${Date.now()}`, createdAt: new Date().toISOString() } as EODReport
      setEODReports((prev) => [newReport, ...prev])
      return newReport
    }
    // CRITICAL: Workspace is required for data isolation
    if (!currentWorkspaceId) {
      const error = new Error("No workspace selected. Please select a workspace to submit EOD report.")
      setError(getErrorMessage(error))
      throw error
    }
    try {
      const reportWithWorkspace = {
        ...report,
        workspaceId: currentWorkspaceId,
      }
      const newReport = await api.eodReports.create(reportWithWorkspace as Parameters<typeof api.eodReports.create>[0])
      setEODReports((prev) => [newReport, ...prev])
      return newReport
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, currentWorkspaceId])

  const updateEODReport = useCallback(async (id: string, updates: Partial<EODReport>) => {
    if (isDemoMode) {
      const existingReport = eodReports.find(r => r.id === id)
      if (existingReport) {
        const updated = { ...existingReport, ...updates }
        setEODReports((prev) => prev.map((r) => (r.id === id ? updated : r)))
        return updated
      }
      throw new Error("Report not found")
    }
    try {
      const updatedReport = await api.eodReports.update(id, updates)
      setEODReports((prev) => prev.map((r) => (r.id === id ? updatedReport : r)))
      return updatedReport
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, eodReports])

  const deleteEODReport = useCallback(async (id: string) => {
    if (isDemoMode) {
      setEODReports((prev) => prev.filter((r) => r.id !== id))
      return
    }
    try {
      await api.eodReports.delete(id)
      setEODReports((prev) => prev.filter((r) => r.id !== id))
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode])

  // Member operations
  const updateMember = useCallback(async (memberId: string, updates: Partial<TeamMember>) => {
    if (isDemoMode) {
      const existingMember = teamMembers.find(m => m.id === memberId)
      if (existingMember) {
        const updated = { ...existingMember, ...updates }
        setTeamMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)))
        return updated
      }
      throw new Error("Member not found")
    }
    try {
      const updatedMember = await api.members.update(memberId, updates)
      const mapped = { ...updatedMember, joinDate: updatedMember.joinedAt, userId: updatedMember.userId ?? undefined } as TeamMember
      setTeamMembers((prev) => prev.map((m) => (m.id === memberId ? mapped : m)))
      return mapped
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode, teamMembers])

  const removeMember = useCallback(async (memberId: string) => {
    if (isDemoMode) {
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
      return
    }
    try {
      await api.members.remove(memberId)
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      throw err
    }
  }, [isDemoMode])

  // Refresh data
  const refresh = useCallback(() => {
    return fetchData()
  }, [fetchData])

  // Reset demo data to defaults (clears localStorage)
  const resetDemoData = useCallback(() => {
    if (!isDemoMode) return

    // Clear localStorage
    Object.values(DEMO_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key)
    })

    // Reset to default demo data
    setTeamMembers(getDemoTeamMembers())
    setRocks(getDemoRocks())
    setAssignedTasks(getDemoTasks())
    setEODReports(getDemoEODReports())

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

    // State setters (for compatibility with existing components)
    setTeamMembers,
    setRocks,
    setAssignedTasks,
    setEODReports,

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
