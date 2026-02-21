"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { useWorkspaces, useWorkspaceStore } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import { getDemoAnalyticsData } from "@/lib/demo-data"
import { CONFIG } from "@/lib/config"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
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
import { GoalVsActualChart } from "@/components/analytics/goal-vs-actual-chart"
import { Skeleton } from "@/components/ui/skeleton"
import { BarChart3, Calendar, Download } from "lucide-react"

import { EmptyState } from "@/components/shared/empty-state"

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

async function analyticsFetcher([, workspaceId, dateRange]: [string, string, string]): Promise<AnalyticsData> {
  const params = new URLSearchParams({ dateRange, workspaceId })
  const response = await fetch(`/api/analytics?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch analytics (${response.status})`)
  }
  const result = await response.json()
  if (!result.success) {
    throw new Error(result.error || "Failed to fetch analytics")
  }
  return result.data
}

export function AnalyticsPage() {
  const { workspaces } = useWorkspaces()
  const { currentWorkspaceId } = useWorkspaceStore()
  const { isDemoMode } = useApp()
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d")
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  // Sync selected workspace with current workspace from the store
  useEffect(() => {
    if (currentWorkspaceId && currentWorkspaceId !== selectedWorkspaceId) {
      setSelectedWorkspaceId(currentWorkspaceId)
    }
  }, [currentWorkspaceId, selectedWorkspaceId])

  // SWR for real data fetching
  const shouldFetch = !isDemoMode && !!selectedWorkspaceId
  const { data: swrData, error: swrError, isLoading: swrLoading, mutate } = useSWR<AnalyticsData>(
    shouldFetch ? ["analytics", selectedWorkspaceId, dateRange] : null,
    analyticsFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: CONFIG.polling.standard,
      dedupingInterval: 5000,
    }
  )

  // Demo mode data
  const demoData = isDemoMode
    ? getDemoAnalyticsData(dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 365)
    : null

  const data = isDemoMode ? demoData : swrData
  const loading = isDemoMode ? false : swrLoading
  const error = isDemoMode ? null : (swrError ? (swrError instanceof Error ? swrError.message : "Failed to load analytics") : null)

  const exportToCSV = (analyticsData: AnalyticsData) => {
    const rows: string[][] = [
      ["Metric", "Value"],
      ["Rock Completion Rate", `${analyticsData.metrics.rockCompletionRate}%`],
      ["Completed Rocks", `${analyticsData.metrics.completedRocks}`],
      ["Total Rocks", `${analyticsData.metrics.totalRocks}`],
      ["Task Completion Rate", `${analyticsData.metrics.taskCompletionRate}%`],
      ["Completed Tasks", `${analyticsData.metrics.completedTasks}`],
      ["Total Tasks", `${analyticsData.metrics.totalTasks}`],
      ["EOD Completion Rate", `${analyticsData.metrics.eodCompletionRate}%`],
      ["Total Reports", `${analyticsData.metrics.totalReports}`],
      [],
      ["Top Performers"],
      ["Name", "Tasks Completed", "Rocks Completed", "EOD Reports", "Score"],
      ...analyticsData.topPerformers.map((p) => [p.name, `${p.tasksCompleted}`, `${p.rocksCompleted}`, `${p.eodReports}`, `${p.score}`]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `taskspace-analytics-${dateRange}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const dateRangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "1y", label: "Last year" },
  ]

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
          <Button onClick={() => mutate()} variant="outline" size="sm">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <EmptyState
          icon={BarChart3}
          title="No analytics data available"
          description="Analytics will appear here once your team starts creating tasks, setting rocks, and submitting EOD reports. Get started to see your performance insights!"
          size="lg"
        />
      </div>
    )
  }

  const hasNoActivity =
    data.metrics.totalRocks === 0 &&
    data.metrics.totalTasks === 0 &&
    data.metrics.totalReports === 0

  return (
    <div className="flex-1 space-y-6 p-8">
      <NoWorkspaceAlert />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2.5">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 mt-2">
            Track team performance, completion rates, and activity patterns
          </p>
        </div>
        {data && !hasNoActivity && (
          <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToCSV(data)}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        )}
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
            <SelectTrigger className="w-full sm:w-[200px]">
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

      {hasNoActivity ? (
        <div className="bg-white rounded-xl shadow-card border border-dashed border-slate-200">
          <EmptyState
            icon={BarChart3}
            title="No activity data yet"
            description="Your analytics dashboard will come to life once your team starts working. Create tasks, set quarterly rocks, and submit EOD reports to see performance charts and insights here."
            size="lg"
          />
        </div>
      ) : (
        <>
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

          {/* Goal vs Actual + Top Performers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GoalVsActualChart data={{
              rocksPlanned: data.metrics.totalRocks,
              rocksCompleted: data.metrics.completedRocks,
              tasksCreated: data.metrics.totalTasks,
              tasksCompleted: data.metrics.completedTasks,
            }} />
            <TopPerformersCard performers={data.topPerformers} />
          </div>
        </>
      )}
    </div>
  )
}
