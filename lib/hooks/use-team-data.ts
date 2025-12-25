"use client"

import { useState, useEffect, useCallback } from "react"
import type { TeamMember, Rock, AssignedTask, EODReport } from "../types"
import { api } from "../api/client"
import { useApp } from "../contexts/app-context"

export function useTeamData() {
  const { isAuthenticated, currentOrganization } = useApp()
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
  }, [isAuthenticated, currentOrganization])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Rock operations
  const createRock = useCallback(async (rock: Partial<Rock>) => {
    try {
      const newRock = await api.rocks.create(rock)
      setRocks((prev) => [...prev, newRock])
      return newRock
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateRock = useCallback(async (id: string, updates: Partial<Rock>) => {
    try {
      const updatedRock = await api.rocks.update(id, updates)
      setRocks((prev) => prev.map((r) => (r.id === id ? updatedRock : r)))
      return updatedRock
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const deleteRock = useCallback(async (id: string) => {
    try {
      await api.rocks.delete(id)
      setRocks((prev) => prev.filter((r) => r.id !== id))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  // Task operations
  const createTask = useCallback(async (task: Partial<AssignedTask>) => {
    try {
      const newTask = await api.tasks.create(task)
      setAssignedTasks((prev) => [...prev, newTask])
      return newTask
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateTask = useCallback(async (id: string, updates: Partial<AssignedTask>) => {
    try {
      const updatedTask = await api.tasks.update(id, updates)
      setAssignedTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))
      return updatedTask
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    try {
      await api.tasks.delete(id)
      setAssignedTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  // EOD Report operations
  const submitEODReport = useCallback(async (report: Partial<EODReport>) => {
    try {
      const newReport = await api.eodReports.create(report)
      setEODReports((prev) => [newReport, ...prev])
      return newReport
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const updateEODReport = useCallback(async (id: string, updates: Partial<EODReport>) => {
    try {
      const updatedReport = await api.eodReports.update(id, updates)
      setEODReports((prev) => prev.map((r) => (r.id === id ? updatedReport : r)))
      return updatedReport
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  // Member operations
  const updateMember = useCallback(async (memberId: string, updates: Partial<TeamMember>) => {
    try {
      const updatedMember = await api.members.update(memberId, updates)
      setTeamMembers((prev) => prev.map((m) => (m.id === memberId ? updatedMember : m)))
      return updatedMember
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

  const removeMember = useCallback(async (memberId: string) => {
    try {
      await api.members.remove(memberId)
      setTeamMembers((prev) => prev.filter((m) => m.id !== memberId))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }, [])

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
