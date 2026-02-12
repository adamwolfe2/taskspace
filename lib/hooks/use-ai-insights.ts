"use client"

import { useState, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api/client"
import type { EODInsight } from "@/lib/types"

/**
 * AI insights result for manager dashboard (POST /api/ai/manager-insights)
 */
export interface ManagerAiInsights {
  summary: string
  teamHealth: "good" | "warning" | "critical"
  insights: Array<{ title: string; description: string; type: "positive" | "warning" | "action" }>
  suggestedActions: string[]
}

interface DirectReportSummary {
  name: string
  tasksCompleted: number
  rocksOnTrack: number
  eodRate: number
}

/**
 * Hook for fetching manager-level AI insights (on-demand, button click)
 */
export function useManagerAiInsights() {
  const { toast } = useToast()
  const [data, setData] = useState<ManagerAiInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchInsights = useCallback(async (workspaceId: string, directReports: DirectReportSummary[]) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ai/manager-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspaceId, directReports }),
      })
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch {
      toast({
        title: "AI Insights unavailable",
        description: "Could not generate insights right now. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  return { data, isLoading, fetchInsights }
}

/**
 * Hook for fetching admin-level EOD AI insights (auto-load on mount)
 */
export function useAdminAiInsights(days: number = 7) {
  const { toast } = useToast()
  const [data, setData] = useState<EODInsight[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchInsights = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await api.ai.getInsights(days)
      setData(result)
    } catch {
      toast({
        title: "AI Insights unavailable",
        description: "Could not load AI insights. They will be retried on next page load.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [days, toast])

  return { data, isLoading, fetchInsights }
}
