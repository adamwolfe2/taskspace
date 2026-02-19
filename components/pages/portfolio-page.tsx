"use client"

import { useState, useEffect, useCallback } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { OrgCard } from "@/components/portfolio/org-card"
import { PortfolioTrends } from "@/components/portfolio/portfolio-trends"
import { CreateOrgDialog } from "@/components/portfolio/create-org-dialog"
import { ExecutiveSummary } from "@/components/portfolio/executive-summary"
import { PortfolioHealthOverview } from "@/components/portfolio/portfolio-health-overview"
import { CrossOrgTaskDialog } from "@/components/portfolio/cross-org-task-dialog"
import { LayoutGrid, TrendingUp, Plus, ArrowRightLeft } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/shared/error-boundary"

interface PortfolioOrg {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
  role: string
  memberCount: number
  eodsToday: number
  activeTasks: number
  openEscalations: number
  plan: string
  eodRate7Day: number
  eodRateTrend: "up" | "down" | "stable"
  completedTasksThisWeek: number
  riskLevel: "healthy" | "warning" | "critical"
  avgRockProgress: number
  rockHealth: { onTrack: number; atRisk: number; blocked: number; completed: number }
}

type ViewMode = "grid" | "trends"

export function PortfolioPage() {
  const { setCurrentPage } = useApp()
  const [orgs, setOrgs] = useState<PortfolioOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCrossOrgTask, setShowCrossOrgTask] = useState(false)
  const [trends, setTrends] = useState<{date: string; eodSubmissionRate: number; completedTaskCount: number; openEscalationCount: number}[]>([])

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/super-admin/portfolio", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const json = await res.json()
      if (json.success) {
        setOrgs(json.data.orgs)
        setTrends(json.data.trends ?? [])
      } else {
        setError(json.error || "Failed to load portfolio")
      }
    } catch {
      setError("Failed to load portfolio")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPortfolio()
  }, [fetchPortfolio])

  const handleOrgClick = (orgId: string) => {
    // Store selected org ID for detail view, then navigate
    sessionStorage.setItem("portfolio-detail-orgId", orgId)
    setCurrentPage("portfolio-detail")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-5 space-y-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-4 pt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <p className="text-sm text-red-600 mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchPortfolio}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Summary stats
  const totalMembers = orgs.reduce((sum, o) => sum + o.memberCount, 0)
  const totalEods = orgs.reduce((sum, o) => sum + o.eodsToday, 0)
  const totalTasks = orgs.reduce((sum, o) => sum + o.activeTasks, 0)
  const totalEscalations = orgs.reduce((sum, o) => sum + o.openEscalations, 0)

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Portfolio</h1>
          <p className="text-sm text-slate-500 mt-1">
            {orgs.length} organizations &middot; {totalMembers} total members
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Overview
          </Button>
          <Button
            variant={viewMode === "trends" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("trends")}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Trends
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCrossOrgTask(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            Cross-Org Task
          </Button>
          <Button size="sm" onClick={() => setShowCreateOrg(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Org
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{orgs.length}</div>
          <div className="text-xs text-slate-500">Organizations</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{totalEods}</div>
          <div className="text-xs text-slate-500">EODs Today</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{totalTasks}</div>
          <div className="text-xs text-slate-500">Active Tasks</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{totalEscalations}</div>
          <div className="text-xs text-slate-500 text-red-600">Open Escalations</div>
        </div>
      </div>

      {/* Portfolio Health Overview */}
      <PortfolioHealthOverview orgs={orgs} trends={trends} />

      {/* Content */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <OrgCard
              key={org.id}
              {...org}
              onClick={() => handleOrgClick(org.id)}
            />
          ))}
          {orgs.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No organizations found. You need owner or admin role in at least one org.
            </div>
          )}
        </div>
      ) : (
        <PortfolioTrends />
      )}

      {/* AI Executive Briefing */}
      <ExecutiveSummary />

      <CreateOrgDialog
        open={showCreateOrg}
        onOpenChange={setShowCreateOrg}
        onCreated={fetchPortfolio}
      />

      <CrossOrgTaskDialog
        open={showCrossOrgTask}
        onOpenChange={setShowCrossOrgTask}
        orgs={orgs.map(o => ({ id: o.id, name: o.name }))}
        onCreated={fetchPortfolio}
      />
    </div>
    </ErrorBoundary>
  )
}
