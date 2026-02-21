"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BarChart3,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Circle,
  HelpCircle,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher"
import { MetricCard } from "./metric-card"
import { AddMetricDialog } from "./add-metric-dialog"
import { ScorecardTrendChart } from "./scorecard-trend-chart"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { ScorecardSummary } from "@/lib/db/scorecard"
import { getDemoScorecardData, DEMO_READONLY_MESSAGE } from "@/lib/demo-data"

interface ScorecardData {
  summary: ScorecardSummary[]
  stats: { green: number; yellow: number; red: number; gray: number; total: number }
  redMetrics: ScorecardSummary[]
  weekStart: string
  canEdit: boolean
}

type ViewMode = "cards" | "table"

const statusConfig = {
  green: { icon: TrendingUp, color: "text-green-600", bg: "bg-green-100", label: "On Track" },
  yellow: { icon: Minus, color: "text-yellow-600", bg: "bg-yellow-100", label: "At Risk" },
  red: { icon: TrendingDown, color: "text-red-600", bg: "bg-red-100", label: "Off Track" },
  gray: { icon: Circle, color: "text-slate-400", bg: "bg-slate-100", label: "No Data" },
}

export function WorkspaceScorecardPage() {
  const { currentWorkspace, currentWorkspaceId, isLoading: workspaceLoading } = useWorkspaces()
  const { isDemoMode } = useApp()
  const { toast } = useToast()

  const [data, setData] = useState<ScorecardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("cards")
  const [weekOffset, setWeekOffset] = useState(0)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editMetric, setEditMetric] = useState<ScorecardSummary | null>(null)
  const [deleteMetricId, setDeleteMetricId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"scorecard" | "trends">("scorecard")
  const [trendsData, setTrendsData] = useState<{
    weeks: string[]
    metrics: Array<{
      metric: { id: string; name: string; targetValue?: number; targetDirection: string; unit: string; ownerName?: string }
      entries: Record<string, { value: number; status: string } | null>
    }>
  } | null>(null)
  const [trendsLoading, setTrendsLoading] = useState(false)
  const [aiInsights, setAiInsights] = useState<{
    insights: Array<{ metricName: string; trend: string; message: string; severity: "info" | "warning" | "critical" }>
    summary: string
    suggestedActions: string[]
  } | null>(null)
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false)

  // Calculate week start based on offset
  const getWeekStartDate = useCallback((offset: number) => {
    const d = new Date()
    // Get Monday of current week
    const dayOfWeek = d.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    d.setDate(d.getDate() - daysToSubtract + offset * 7)
    return d.toISOString().split("T")[0]
  }, [])

  const fetchScorecard = useCallback(async () => {
    if (isDemoMode) {
      const demoData = getDemoScorecardData()
      setData(demoData as unknown as ScorecardData)
      setLoading(false)
      return
    }
    if (!currentWorkspaceId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const weekStart = getWeekStartDate(weekOffset)
      const response = await fetch(
        `/api/scorecards/summary?workspaceId=${currentWorkspaceId}&weekStart=${weekStart}`,
        { credentials: "include" }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch scorecard data")
      }

      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || "Failed to load scorecard")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load scorecard")
    } finally {
      setLoading(false)
    }
  }, [isDemoMode, currentWorkspaceId, weekOffset, getWeekStartDate])

  useEffect(() => {
    fetchScorecard()
  }, [fetchScorecard])

  const fetchTrends = useCallback(async () => {
    if (isDemoMode) {
      const demoData = getDemoScorecardData()
      setTrendsData(demoData.trends)
      return
    }
    if (!currentWorkspaceId) return
    setTrendsLoading(true)
    try {
      const response = await fetch(
        `/api/scorecards/trends?workspaceId=${currentWorkspaceId}&weeks=13`,
        { credentials: "include" }
      )
      const result = await response.json()
      if (result.success) {
        setTrendsData(result.data)
      }
    } catch {
      // Silently fail for trends
    } finally {
      setTrendsLoading(false)
    }
  }, [isDemoMode, currentWorkspaceId])

  useEffect(() => {
    if (activeTab === "trends") {
      fetchTrends()
    }
  }, [activeTab, fetchTrends])

  const fetchAiInsights = async () => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE })
      return
    }
    if (!currentWorkspaceId) return
    setAiInsightsLoading(true)
    try {
      const response = await fetch("/api/ai/scorecard-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ workspaceId: currentWorkspaceId }),
      })
      const result = await response.json()
      if (result.success) {
        setAiInsights(result.data)
      } else {
        toast({ title: "Error", description: result.error || "Failed to generate insights", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate AI insights", variant: "destructive" })
    } finally {
      setAiInsightsLoading(false)
    }
  }

  const handleUpdateEntry = async (metricId: string, value: number, notes?: string) => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE })
      return
    }
    try {
      const weekStart = getWeekStartDate(weekOffset)
      const response = await fetch("/api/scorecards/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ metricId, value, weekStart, notes }),
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to save entry")
      }

      toast({
        title: "Entry Saved",
        description: "Weekly metric value has been updated",
      })

      fetchScorecard()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save entry",
        variant: "destructive",
      })
      throw error
    }
  }

  const handleDeleteMetric = async () => {
    if (isDemoMode) {
      toast({ title: "Demo Mode", description: DEMO_READONLY_MESSAGE })
      setDeleteMetricId(null)
      return
    }
    if (!deleteMetricId) return

    try {
      const response = await fetch(`/api/scorecards/metrics/${deleteMetricId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || "Failed to delete metric")
      }

      toast({
        title: "Metric Deleted",
        description: "The metric has been removed from the scorecard",
      })

      setDeleteMetricId(null)
      fetchScorecard()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete metric",
        variant: "destructive",
      })
    }
  }

  const formatWeekDisplay = (dateStr: string) => {
    const date = new Date(dateStr + "T12:00:00")
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 6)

    return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
  }

  // Loading state
  if (workspaceLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-[220px]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  // No workspace selected
  if (!currentWorkspace) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">No Workspace Selected</h3>
        <p className="text-slate-500 mt-1">Select a workspace to view the scorecard</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Error Loading Scorecard</h3>
        <p className="text-slate-500 mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchScorecard}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Weekly Scorecard
          </h1>
          <p className="text-slate-600 mt-1">
            Track weekly KPIs and measurables for {currentWorkspace.name}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <WorkspaceSwitcher size="sm" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-2 rounded-full hover:bg-slate-100" aria-label="Scorecard help">
                  <HelpCircle className="h-5 w-5 text-slate-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-sm">
                <p className="font-semibold mb-1">About Weekly Scorecard</p>
                <ul className="text-xs space-y-1">
                  <li>
                    <span className="inline-block w-3 h-3 rounded bg-green-100 mr-1"></span> Green =
                    On track (met target)
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded bg-yellow-100 mr-1"></span>{" "}
                    Yellow = At risk (within 10%)
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded bg-red-100 mr-1"></span> Red = Off
                    track (more than 10% off)
                  </li>
                  <li>
                    <span className="inline-block w-3 h-3 rounded bg-slate-100 mr-1"></span> Gray =
                    No data entered
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Stats Summary */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["green", "yellow", "red", "gray"] as const).map((status) => {
            const config = statusConfig[status]
            const Icon = config.icon
            const count = data.stats[status]
            return (
              <Card key={status} className={cn("border", config.bg.replace("100", "50"))}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{count}</p>
                      <p className="text-sm text-slate-600">{config.label}</p>
                    </div>
                    <Icon className={cn("h-8 w-8", config.color)} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "scorecard" | "trends")}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAiInsights}
              disabled={aiInsightsLoading}
            >
              {aiInsightsLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Analyzing</>
              ) : (
                "AI Insights"
              )}
            </Button>
          </div>
        </div>

        <TabsContent value="scorecard">

      {/* Week Navigation & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((prev) => prev - 1)}
            title="Previous week"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 bg-slate-100 rounded-lg">
            <span className="text-sm font-medium text-slate-700">
              {data?.weekStart && formatWeekDisplay(data.weekStart)}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekOffset((prev) => prev + 1)}
            disabled={weekOffset >= 0}
            title="Next week"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekOffset !== 0 && (
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>
              Current Week
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border bg-slate-50 p-1">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="gap-1"
            >
              <LayoutGrid className="h-4 w-4" />
              Cards
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="gap-1"
            >
              <List className="h-4 w-4" />
              Table
            </Button>
          </div>

          {/* Add Metric Button */}
          {data?.canEdit && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Metric
            </Button>
          )}
        </div>
      </div>

      {/* Red Metrics Alert */}
      {data && data.redMetrics.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900">
                  {data.redMetrics.length} metric{data.redMetrics.length > 1 ? "s" : ""} off track
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  {data.redMetrics.map((m) => m.metricName).join(", ")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Display */}
      {data && data.summary.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No metrics on your scorecard yet</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
              The weekly scorecard helps you track key performance indicators (KPIs) and stay on top of what matters most. Add your first metric to get started!
            </p>
            {data.canEdit && (
              <Button className="mt-6" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create your first metric!
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.summary.map((metric) => (
            <MetricCard
              key={metric.metricId}
              metric={metric}
              canEdit={data.canEdit}
              onUpdateEntry={handleUpdateEntry}
              onEditMetric={(id) => {
                const m = data.summary.find((s) => s.metricId === id)
                if (m) {
                  setEditMetric(m)
                  setShowAddDialog(true)
                }
              }}
              onDeleteMetric={(id) => setDeleteMetricId(id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-center">Target</TableHead>
                  <TableHead className="text-center">Actual</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.summary.map((metric) => {
                  const status = statusConfig[metric.currentStatus]
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={metric.metricId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{metric.metricName}</p>
                          {metric.metricDescription && (
                            <p className="text-xs text-slate-500">{metric.metricDescription}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {metric.ownerName || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {metric.targetValue !== undefined
                            ? `${metric.targetValue}${metric.unit ? ` ${metric.unit}` : ""}`
                            : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {metric.currentValue !== undefined && metric.currentValue !== null
                          ? `${metric.currentValue}${metric.unit ? ` ${metric.unit}` : ""}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full",
                            status.bg
                          )}
                        >
                          <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
                          <span className={cn("text-xs font-medium", status.color)}>
                            {status.label}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Display */}
      {aiInsights && (
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-base">AI Scorecard Insights</CardTitle>
            <CardDescription>{aiInsights.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiInsights.insights.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-2">No specific insights generated for this period.</p>
            ) : (
              aiInsights.insights.map((insight, i) => (
                <div key={i} className={cn(
                  "p-3 rounded-lg border",
                  insight.severity === "critical" ? "bg-red-50 border-red-200" :
                  insight.severity === "warning" ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
                )}>
                  <p className="font-medium text-sm">{insight.metricName} ({insight.trend})</p>
                  <p className="text-sm text-slate-600">{insight.message}</p>
                </div>
              ))
            )}
            {aiInsights.suggestedActions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-1">Suggested Actions:</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  {aiInsights.suggestedActions.map((action, i) => (
                    <li key={i}>— {action}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

        </TabsContent>

        <TabsContent value="trends">
          <ScorecardTrendChart trends={trendsData} loading={trendsLoading} />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-slate-900 mb-2">EOS Scorecard</h3>
              <p className="text-sm text-slate-600">
                Track 5-15 weekly measurables to give you an absolute pulse on your business. Review
                in your weekly L10 meetings.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Good Metrics</h3>
              <p className="text-sm text-slate-600">
                Choose metrics that are activity-based, countable weekly, within the owner's
                control, and leading indicators of success.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-slate-900 mb-2">Status Colors</h3>
              <p className="text-sm text-slate-600">
                Green means on track. Yellow is a warning (within 10%). Red needs immediate
                attention. Gray means no data entered yet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Metric Dialog */}
      <AddMetricDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) setEditMetric(null)
        }}
        workspaceId={currentWorkspaceId || ""}
        onMetricAdded={fetchScorecard}
        editMetric={
          editMetric
            ? {
                id: editMetric.metricId,
                name: editMetric.metricName,
                description: editMetric.metricDescription,
                ownerId: editMetric.ownerId,
                targetValue: editMetric.targetValue,
                targetDirection: editMetric.targetDirection,
                unit: editMetric.unit,
                frequency: "weekly",
              }
            : null
        }
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteMetricId} onOpenChange={() => setDeleteMetricId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Metric?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the metric from the scorecard. Historical entries will be preserved
              but the metric will no longer appear in future weeks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMetric}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
