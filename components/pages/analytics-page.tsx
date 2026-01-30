"use client"

import { useState, useEffect } from "react"
import { useWorkspaceContext } from "@/lib/contexts/workspace-context"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MetricsOverview } from "@/components/analytics/metrics-overview"
import { RockCompletionChart } from "@/components/analytics/rock-completion-chart"
import { TaskCompletionChart } from "@/components/analytics/task-completion-chart"
import { EODSubmissionChart } from "@/components/analytics/eod-submission-chart"
import { TopPerformersCard } from "@/components/analytics/top-performers-card"
import { ActivityHeatmap } from "@/components/analytics/activity-heatmap"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnalyticsData {
  rockCompletionData: Array<{ date: string; completed: number }>
  taskCompletionData: Array<{ date: string; completed: number; created: number }>
  eodSubmissionData: Array<{ date: string; submissions: number }>
  metrics: {
    rockCompletionRate: number
    taskCompletionRate: number
    eodCompletionRate: number
    totalRocks: number
    completedRocks: number
    totalTasks: number
    completedTasks: number
    totalReports: number
  }
  topPerformers: Array<{
    userId: string
    name: string
    avatar: string | null
    tasksCompleted: number
    rocksCompleted: number
    eodReports: number
    score: number
  }>
  activityByDayOfWeek: Array<{
    day: string
    avgTasks: number
    avgReports: number
  }>
}

export function AnalyticsPage() {
  const { currentWorkspace, workspaces } = useWorkspaceContext()
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dateRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
  ]

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange, selectedWorkspaceId])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({ dateRange })
      if (selectedWorkspaceId) {
        params.append("workspaceId", selectedWorkspaceId)
      }

      const response = await fetch(`/api/analytics?${params.toString()}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch analytics")
      }

      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <BarChart3 className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-900">Failed to load analytics</h3>
          <p className="text-sm text-slate-500">{error}</p>
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 p-2.5">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          Analytics Dashboard
        </h1>
        <p className="text-slate-500 mt-2">
          Track team performance, completion rates, and activity patterns
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Date Range:</span>
          <div className="flex gap-1">
            {dateRangeOptions.map((option) => (
              <Button
                key={option.value}
                variant={dateRange === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDateRange(option.value as typeof dateRange)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {workspaces.length > 1 && (
          <Select
            value={selectedWorkspaceId || "all"}
            onValueChange={(value) => setSelectedWorkspaceId(value === "all" ? null : value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Workspaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Workspaces</SelectItem>
              {workspaces.map((workspace) => (
                <SelectItem key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Metrics Overview */}
      <MetricsOverview metrics={data.metrics} />

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RockCompletionChart data={data.rockCompletionData} />
        <TaskCompletionChart data={data.taskCompletionData} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EODSubmissionChart data={data.eodSubmissionData} />
        <ActivityHeatmap data={data.activityByDayOfWeek} />
      </div>

      {/* Top Performers */}
      <TopPerformersCard performers={data.topPerformers} />
    </div>
  )
}
