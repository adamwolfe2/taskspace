"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DirectReportCard, DirectReportCardCompact } from "@/components/manager/direct-report-card"
import { DirectReportDetailSheet } from "@/components/manager/direct-report-detail-sheet"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"
import { getDemoManagerDashboard, DEMO_READONLY_MESSAGE } from "@/lib/demo-data"
import { cn } from "@/lib/utils"
import { useManagerAiInsights } from "@/lib/hooks/use-ai-insights"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import type { TeamMember, ManagerDashboard, DirectReport } from "@/lib/types"
import {
  Users,
  Target,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  Filter,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Flame,
  BarChart3,
} from "lucide-react"

interface ManagerDashboardPageProps {
  currentUser: TeamMember
}

export function ManagerDashboardPage({ currentUser: _currentUser }: ManagerDashboardPageProps) {
  const { currentWorkspace } = useWorkspaces()
  const { navigateWithFilter, isDemoMode } = useApp()
  const { toast } = useToast()
  const [dashboard, setDashboard] = useState<ManagerDashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<DirectReport | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [filterStatus, setFilterStatus] = useState<"all" | "needs_attention" | "on_track">("all")
  const [sortBy, setSortBy] = useState<"name" | "overdue" | "rock-progress" | "streak">("overdue")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { data: aiInsights, isLoading: aiInsightsLoading, fetchInsights: fetchAiInsights } = useManagerAiInsights()

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    if (isDemoMode) {
      setDashboard(getDemoManagerDashboard())
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }
    try {
      setIsRefreshing(true)
      // Include workspaceId if available (optional for backward compatibility)
      const params = new URLSearchParams()
      if (currentWorkspace) {
        params.set("workspaceId", currentWorkspace.id)
      }
      const response = await fetch(`/api/manager/dashboard?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setDashboard(data.data)
        setError(null)
      } else {
        setError(data.error || "Failed to load dashboard")
      }
    } catch {
      setError("Failed to load dashboard")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isDemoMode, currentWorkspace])

  useEffect(() => {
    if (currentWorkspace) {
      fetchDashboard()
    }
  }, [fetchDashboard, currentWorkspace])

  const handleAiInsights = async () => {
    if (isDemoMode) {
      toast({ title: "Demo mode", description: DEMO_READONLY_MESSAGE })
      return
    }
    if (!currentWorkspace || !dashboard) return
    fetchAiInsights(
      currentWorkspace.id,
      dashboard.directReports.map((r) => ({
        name: r.name,
        tasksCompleted: r.metrics.completedTasks,
        rocksOnTrack: r.rocks.filter((rock) => rock.status === "on-track").length,
        eodRate: r.eodStatus.submittedToday ? 100 : 0,
      }))
    )
  }

  // Filter direct reports
  const filteredReports = useMemo(() => {
    if (!dashboard) return []

    let reports = dashboard.directReports

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      reports = reports.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.department.toLowerCase().includes(query) ||
          r.email.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (filterStatus === "needs_attention") {
      reports = reports.filter(
        (r) =>
          r.metrics.overdueTasks > 0 ||
          r.rocks.some((rock) => rock.status === "blocked" || rock.status === "at-risk") ||
          r.eodStatus.needsEscalation
      )
    } else if (filterStatus === "on_track") {
      reports = reports.filter(
        (r) =>
          r.metrics.overdueTasks === 0 &&
          !r.rocks.some((rock) => rock.status === "blocked") &&
          !r.eodStatus.needsEscalation
      )
    }

    // Sort
    return [...reports].sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name)
        case "overdue": return b.metrics.overdueTasks - a.metrics.overdueTasks
        case "rock-progress": return b.metrics.avgRockProgress - a.metrics.avgRockProgress
        case "streak": return b.metrics.eodStreakDays - a.metrics.eodStreakDays
        default: return 0
      }
    })
  }, [dashboard, searchQuery, filterStatus, sortBy])

  // Critical alerts (top 5)
  const criticalAlerts = useMemo(() => {
    if (!dashboard) return []
    return dashboard.alerts
      .filter((a) => a.severity === "critical" || a.severity === "high")
      .slice(0, 5)
  }, [dashboard])

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Skeleton loading state */}
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/4" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Show empty state if dashboard loaded successfully but has no direct reports
  if (dashboard && dashboard.directReports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No Direct Reports</h2>
        <p className="text-slate-500 text-center max-w-md mb-4">
          You don't have any team members assigned to you as direct reports yet.
          Set up your org chart in the Organization Chart page to assign reporting structure.
        </p>
        <Button onClick={fetchDashboard} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  // Show error state if there was an error or dashboard failed to load
  if (error || !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          {error || "Unable to load dashboard"}
        </h2>
        <p className="text-slate-500 text-center max-w-md mb-4">
          There was a problem loading your manager dashboard. Please try again.
        </p>
        <Button onClick={fetchDashboard} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  const { teamSummary, directReports, insights } = dashboard

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">My Team</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {teamSummary.totalMembers} direct report{teamSummary.totalMembers !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiInsights}
            disabled={aiInsightsLoading}
          >
            {aiInsightsLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI Insights
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchDashboard}
            disabled={isRefreshing}
            className="shrink-0"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Team Members</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{teamSummary.totalMembers}</p>
                <p className="text-xs text-slate-400 mt-1">{teamSummary.activeMembers} active</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Pending Tasks</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{teamSummary.totalPendingTasks}</p>
                <p className={cn(
                  "text-xs mt-1",
                  teamSummary.totalOverdueTasks > 0 ? "text-red-500" : "text-slate-400"
                )}>
                  {teamSummary.totalOverdueTasks > 0
                    ? `${teamSummary.totalOverdueTasks} overdue`
                    : "None overdue"}
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                teamSummary.totalOverdueTasks > 0 ? "bg-red-50" : "bg-slate-100"
              )}>
                <CheckCircle2 className={cn(
                  "h-5 w-5",
                  teamSummary.totalOverdueTasks > 0 ? "text-red-600" : "text-slate-600"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Rock Progress</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{teamSummary.avgRockProgress}%</p>
                <p className={cn(
                  "text-xs mt-1",
                  teamSummary.rocksBlocked > 0 ? "text-red-500" : "text-slate-400"
                )}>
                  {teamSummary.rocksBlocked > 0
                    ? `${teamSummary.rocksBlocked} blocked`
                    : `${teamSummary.rocksOnTrack} on track`}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">EOD Today</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{teamSummary.eodSubmissionRateToday}%</p>
                <p className="text-xs text-slate-400 mt-1">
                  {Math.round(teamSummary.eodSubmissionRateToday * teamSummary.activeMembers / 100)}/{teamSummary.activeMembers} submitted
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {criticalAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Needs Attention
              <Badge variant="outline" className="ml-auto bg-red-100 text-red-700 border-red-200">
                {criticalAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {criticalAlerts.map((alert, index) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg bg-white/60 border animate-fade-in-up opacity-0",
                  alert.severity === "critical" ? "border-red-200" : "border-amber-200"
                )}
                style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <AlertCircle className={cn(
                  "h-5 w-5 shrink-0",
                  alert.severity === "critical" ? "text-red-600" : "text-amber-600"
                )} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{alert.title}</p>
                  <p className="text-xs text-slate-500">{alert.memberName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const report = directReports.find((r) => r.id === alert.memberId)
                    if (report) setSelectedReport(report)
                  }}
                >
                  View
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-slate-600" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insights.slice(0, 3).map((insight, index) => (
              <div
                key={insight.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border animate-fade-in-up opacity-0",
                  insight.priority === "high" ? "bg-red-50 border-red-200" :
                  insight.priority === "medium" ? "bg-slate-50 border-slate-200" :
                  "bg-white border-slate-200"
                )}
                style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                {insight.type === "workload" && <BarChart3 className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />}
                {insight.type === "performance" && <TrendingUp className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />}
                {insight.type === "pattern" && <Clock className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />}
                {insight.type === "sentiment" && <Flame className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />}
                {insight.type === "recommendation" && <Sparkles className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="font-medium text-slate-900 text-sm">{insight.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{insight.description}</p>
                  {insight.suggestedAction && (
                    <p className="text-xs text-slate-600 mt-1 font-medium">{insight.suggestedAction}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* AI Insights Card */}
      {aiInsights && (
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-600" />
              AI Team Insights
              <Badge variant={aiInsights.teamHealth === "good" ? "default" : aiInsights.teamHealth === "warning" ? "secondary" : "destructive"} className="ml-2">
                {aiInsights.teamHealth}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-700">{aiInsights.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {aiInsights.insights.map((insight, i) => (
                <div
                  key={i}
                  className={cn(
                    "p-3 rounded-lg border text-sm",
                    insight.type === "positive" ? "bg-white border-slate-200" :
                    insight.type === "warning" ? "bg-red-50 border-red-200" :
                    "bg-slate-50 border-slate-200"
                  )}
                >
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-slate-600 text-xs mt-1">{insight.description}</p>
                </div>
              ))}
            </div>
            {aiInsights.suggestedActions.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-slate-700 mb-1">Suggested Actions:</p>
                <ul className="text-xs text-slate-600 space-y-1">
                  {aiInsights.suggestedActions.map((a, i) => <li key={i}>- {a}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Direct Reports Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Direct Reports</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
                <SelectItem value="on_track">On Track</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overdue">Most Overdue</SelectItem>
                <SelectItem value="rock-progress">Rock Progress</SelectItem>
                <SelectItem value="streak">EOD Streak</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-lg p-0.5">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">
              {searchQuery || filterStatus !== "all"
                ? "No team members match your filters"
                : "No direct reports found"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredReports.map((report, index) => (
              <div
                key={report.id}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}
              >
                <DirectReportCard
                  report={report}
                  onClick={() => setSelectedReport(report)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((report, index) => (
              <div
                key={report.id}
                className="animate-fade-in-up opacity-0"
                style={{ animationDelay: `${index * 0.03}s`, animationFillMode: 'forwards' }}
              >
                <DirectReportCardCompact
                  report={report}
                  onClick={() => setSelectedReport(report)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Progress Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            <div>
              <p className="text-sm text-slate-500 mb-2">Avg Task Completion</p>
              <Progress value={teamSummary.avgTaskCompletionRate} className="h-2" />
              <p className="text-xs text-slate-400 mt-1">{teamSummary.avgTaskCompletionRate}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2">Avg Rock Progress</p>
              <Progress value={teamSummary.avgRockProgress} className="h-2" />
              <p className="text-xs text-slate-400 mt-1">{teamSummary.avgRockProgress}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2">EOD Rate (7 days)</p>
              <Progress value={teamSummary.eodSubmissionRate7Days} className="h-2" />
              <p className="text-xs text-slate-400 mt-1">{teamSummary.eodSubmissionRate7Days}%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-2">Avg EOD Streak</p>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-slate-500" />
                <span className="text-lg font-bold text-slate-900">{teamSummary.avgEodStreak}</span>
                <span className="text-sm text-slate-400">days</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <DirectReportDetailSheet
        report={selectedReport}
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
        onViewTasks={() => {
          if (selectedReport) {
            setSelectedReport(null)
            navigateWithFilter("tasks", {
              userId: selectedReport.userId,
              userName: selectedReport.name,
            })
          }
        }}
        onViewRocks={() => {
          if (selectedReport) {
            setSelectedReport(null)
            navigateWithFilter("rocks", {
              userId: selectedReport.userId,
              userName: selectedReport.name,
            })
          }
        }}
        onViewEOD={() => {
          if (selectedReport) {
            setSelectedReport(null)
            navigateWithFilter("history", {
              userId: selectedReport.userId,
              userName: selectedReport.name,
            })
          }
        }}
        onSendMessage={(userId) => {
          // Open message/email
          const report = directReports.find((r) => r.userId === userId)
          if (report) {
            window.open(`mailto:${report.email}`, "_blank")
          }
        }}
      />
    </div>
    </ErrorBoundary>
  )
}
