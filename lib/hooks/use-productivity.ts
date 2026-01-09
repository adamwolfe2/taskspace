"use client"

import useSWR from "swr"
import type {
  FocusScore,
  UserStreak,
  DailyEnergy,
  FocusBlock,
  FocusBlockCategory,
  DailyEnergyInput,
  FocusBlockInput,
} from "@/lib/types"

interface ProductivityDashboardData {
  focusScore: FocusScore
  streak: UserStreak
  weeklyHours: {
    date: string
    dayLabel: string
    totalMinutes: number
    byCategory: Partial<Record<FocusBlockCategory, number>>
  }[]
  tasksThisWeek: {
    completed: number
    total: number
    rate: number
  }
  rocksProgress: {
    average: number
    onTrack: number
    atRisk: number
    blocked: number
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) {
    throw new Error("Failed to fetch")
  }
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error || "Unknown error")
  }
  return json.data
}

/**
 * Hook to fetch all productivity dashboard data
 */
export function useProductivityDashboard(userId?: string) {
  const url = userId
    ? `/api/productivity/dashboard?userId=${userId}`
    : "/api/productivity/dashboard"

  const { data, error, isLoading, mutate } = useSWR<ProductivityDashboardData>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 60000, // Refresh every minute
    }
  )

  return {
    data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook to fetch just the focus score
 */
export function useFocusScore(userId?: string) {
  const url = userId
    ? `/api/productivity/focus-score?userId=${userId}`
    : "/api/productivity/focus-score"

  const { data, error, isLoading, mutate } = useSWR<FocusScore>(url, fetcher, {
    revalidateOnFocus: false,
  })

  return {
    focusScore: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook to fetch streak data
 */
export function useStreak(userId?: string) {
  const url = userId
    ? `/api/productivity/streak?userId=${userId}`
    : "/api/productivity/streak"

  const { data, error, isLoading, mutate } = useSWR<UserStreak>(url, fetcher, {
    revalidateOnFocus: false,
  })

  return {
    streak: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Save daily energy check-in
 */
export async function saveEnergy(input: DailyEnergyInput): Promise<DailyEnergy> {
  const res = await fetch("/api/productivity/energy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error || "Failed to save energy")
  }
  return json.data
}

/**
 * Save focus block
 */
export async function saveFocusBlock(input: FocusBlockInput): Promise<FocusBlock> {
  const res = await fetch("/api/productivity/focus-blocks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  })

  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error || "Failed to save focus block")
  }
  return json.data
}

/**
 * Hook to fetch today's focus blocks
 */
export function useTodayFocusBlocks(userId?: string) {
  const today = new Date().toISOString().split("T")[0]
  const baseUrl = "/api/productivity/focus-blocks"
  const params = new URLSearchParams({
    startDate: today,
    endDate: today,
  })
  if (userId) {
    params.set("userId", userId)
  }

  const { data, error, isLoading, mutate } = useSWR<FocusBlock[]>(
    `${baseUrl}?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    focusBlocks: data || [],
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Hook to fetch today's energy
 */
export function useTodayEnergy(userId?: string) {
  const today = new Date().toISOString().split("T")[0]
  const baseUrl = "/api/productivity/energy"
  const params = new URLSearchParams({ date: today })
  if (userId) {
    params.set("userId", userId)
  }

  const { data, error, isLoading, mutate } = useSWR<DailyEnergy | null>(
    `${baseUrl}?${params.toString()}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  return {
    energy: data,
    isLoading,
    isError: !!error,
    error,
    refresh: mutate,
  }
}

/**
 * Update streak after EOD submission
 */
export async function updateStreak(date?: string): Promise<{
  currentStreak: number
  longestStreak: number
  isNewRecord: boolean
}> {
  const res = await fetch("/api/productivity/streak/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ date }),
  })

  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error || "Failed to update streak")
  }
  return json.data
}
