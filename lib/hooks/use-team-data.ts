"use client"

import { useState, useEffect, useCallback } from "react"
import type { TeamMember, Rock, AssignedTask, EODReport } from "../types"
import { api } from "../api/client"
import { useApp } from "../contexts/app-context"

// Demo data for the demo mode
const today = new Date().toISOString().split("T")[0]
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]

const DEMO_TEAM_MEMBERS: TeamMember[] = [
  { id: "demo-user-1", name: "Adam Wolfe", email: "adam@demo.com", role: "admin", department: "Operations", joinDate: "2024-01-15", status: "active" },
  { id: "demo-user-2", name: "Sarah Chen", email: "sarah@demo.com", role: "member", department: "Property Management", joinDate: "2024-02-01", status: "active" },
  { id: "demo-user-3", name: "Mike Johnson", email: "mike@demo.com", role: "member", department: "Maintenance", joinDate: "2024-02-15", status: "active" },
  { id: "demo-user-4", name: "Lisa Park", email: "lisa@demo.com", role: "member", department: "Leasing", joinDate: "2024-03-01", status: "active" },
]

const DEMO_ROCKS: Rock[] = [
  { id: "rock-1", userId: "demo-user-2", organizationId: "demo-org-1", title: "Complete Q1 property inspections", description: "Inspect all 50 properties by end of quarter", progress: 72, status: "on-track", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
  { id: "rock-2", userId: "demo-user-3", organizationId: "demo-org-1", title: "Reduce maintenance backlog by 40%", description: "Clear outstanding maintenance tickets", progress: 45, status: "at-risk", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
  { id: "rock-3", userId: "demo-user-4", organizationId: "demo-org-1", title: "Achieve 95% occupancy rate", description: "Fill vacant units across portfolio", progress: 88, status: "on-track", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
  { id: "rock-4", userId: "demo-user-1", organizationId: "demo-org-1", title: "Implement new property management software", description: "Roll out and train team on new system", progress: 60, status: "on-track", dueDate: "2025-03-31", quarter: "Q1 2025", createdAt: "2024-12-01", updatedAt: today },
]

const DEMO_TASKS: AssignedTask[] = [
  { id: "task-1", organizationId: "demo-org-1", title: "Review vendor contracts", description: "Annual review of all vendor agreements", assigneeId: "demo-user-2", assigneeName: "Sarah Chen", assignedById: "demo-user-1", assignedByName: "Adam Wolfe", type: "assigned", rockId: null, rockTitle: null, priority: "high", dueDate: today, status: "pending", completedAt: null, addedToEOD: false, eodReportId: null, createdAt: yesterday, updatedAt: yesterday },
  { id: "task-2", organizationId: "demo-org-1", title: "Fix HVAC unit at 123 Main St", description: "Unit 4B reported heating issues", assigneeId: "demo-user-3", assigneeName: "Mike Johnson", assignedById: "demo-user-1", assignedByName: "Adam Wolfe", type: "assigned", rockId: "rock-2", rockTitle: "Reduce maintenance backlog by 40%", priority: "high", dueDate: today, status: "in-progress", completedAt: null, addedToEOD: false, eodReportId: null, createdAt: yesterday, updatedAt: today },
  { id: "task-3", organizationId: "demo-org-1", title: "Schedule property tours for prospects", description: "3 prospects interested in 2BR units", assigneeId: "demo-user-4", assigneeName: "Lisa Park", assignedById: "demo-user-1", assignedByName: "Adam Wolfe", type: "assigned", rockId: "rock-3", rockTitle: "Achieve 95% occupancy rate", priority: "medium", dueDate: today, status: "pending", completedAt: null, addedToEOD: false, eodReportId: null, createdAt: yesterday, updatedAt: yesterday },
]

const DEMO_EOD_REPORTS: EODReport[] = [
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
    submittedAt: yesterday,
    createdAt: yesterday,
  },
]

export function useTeamData() {
  const { isAuthenticated, currentOrganization, isDemoMode } = useApp()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [rocks, setRocks] = useState<Rock[]>([])
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([])
  const [eodReports, setEODReports] = useState<EODReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !currentOrganization) {
      setIsLoading(false)
      return
    }

    // Use demo data in demo mode
    if (isDemoMode) {
      setTeamMembers(DEMO_TEAM_MEMBERS)
      setRocks(DEMO_ROCKS)
      setAssignedTasks(DEMO_TASKS)
      setEODReports(DEMO_EOD_REPORTS)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [membersData, rocksData, tasksData, reportsData] = await Promise.all([
        api.members.list(),
        api.rocks.list(),
        api.tasks.list(),
        api.eodReports.list(),
      ])

      setTeamMembers(membersData)
      setRocks(rocksData)
      setAssignedTasks(tasksData)
      setEODReports(reportsData)
    } catch (err: any) {
      setError(err.message || "Failed to load data")
      console.error("Failed to load team data:", err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, currentOrganization, isDemoMode])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Rock operations
  const createRock = useCallback(async (rock: Partial<Rock>) => {
    if (isDemoMode) {
      const newRock = { ...rock, id: `rock-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as Rock
      setRocks((prev) => [...prev, newRock])
      return newRock
    }
    try {
      const newRock = await api.rocks.create(rock)
      setRocks((prev) => [...prev, newRock])
      return newRock
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [isDemoMode])

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
    } catch (err: any) {
      setError(err.message)
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
    } catch (err: any) {
      setError(err.message)
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
    try {
      const newTask = await api.tasks.create(task)
      setAssignedTasks((prev) => [...prev, newTask])
      return newTask
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [isDemoMode])

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
    } catch (err: any) {
      setError(err.message)
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
    } catch (err: any) {
      setError(err.message)
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
    try {
      const newReport = await api.eodReports.create(report)
      setEODReports((prev) => [newReport, ...prev])
      return newReport
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [isDemoMode])

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
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [isDemoMode, eodReports])

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
      setTeamMembers((prev) => prev.map((m) => (m.id === memberId ? updatedMember : m)))
      return updatedMember
    } catch (err: any) {
      setError(err.message)
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
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [isDemoMode])

  // Refresh data
  const refresh = useCallback(() => {
    return fetchData()
  }, [fetchData])

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

    // Member operations
    updateMember,
    removeMember,

    // Utility
    refresh,
  }
}
