"use client"

import { useState, useEffect, useCallback } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { OrgCard } from "@/components/portfolio/org-card"
import { PortfolioTrends } from "@/components/portfolio/portfolio-trends"
import { CreateOrgDialog } from "@/components/portfolio/create-org-dialog"
import { ExecutiveSummary } from "@/components/portfolio/executive-summary"
import { PortfolioMetricsBar } from "@/components/portfolio/portfolio-metrics-bar"
import { CrossOrgTaskDialog } from "@/components/portfolio/cross-org-task-dialog"
import { QuickWorkspaceSetupDialog } from "@/components/portfolio/quick-workspace-setup-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutGrid, TrendingUp, Plus, ArrowRightLeft, Zap } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"

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

export function PortfolioPage() {
  const { setCurrentPage } = useApp()
  const [orgs, setOrgs] = useState<PortfolioOrg[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showCrossOrgTask, setShowCrossOrgTask] = useState(false)
  const [showQuickSetup, setShowQuickSetup] = useState(false)
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
    sessionStorage.setItem("portfolio-detail-orgId", orgId)
    setCurrentPage("portfolio-detail")
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
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
      <ErrorState
        title="Failed to load portfolio"
        message={error}
        onRetry={fetchPortfolio}
      />
    )
  }

  const totalMembers = orgs.reduce((sum, o) => sum + o.memberCount, 0)

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Portfolio</h1>
          <p className="text-sm text-slate-500 mt-1">
            {orgs.length} organizations &middot; {totalMembers} total members
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowCrossOrgTask(true)}>
            <ArrowRightLeft className="h-4 w-4 mr-1" />
            Cross-Org Task
          </Button>
          <Button size="sm" onClick={() => setShowCreateOrg(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Org
          </Button>
          <Button size="sm" onClick={() => setShowQuickSetup(true)}>
            <Zap className="h-4 w-4 mr-1" />
            Quick Setup
          </Button>
        </div>
      </div>

      {/* Metrics Bar */}
      <PortfolioMetricsBar orgs={orgs} trends={trends} />

      {/* Tabs: Overview / Trends */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview" className="flex-1 sm:flex-initial">
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex-1 sm:flex-initial">
            <TrendingUp className="h-4 w-4 mr-1.5" />
            Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {orgs.length === 0 ? (
            <EmptyState
              title="No organizations"
              description="You need owner or admin role in at least one org to see the portfolio view."
              action={{ label: "Create Organization", onClick: () => setShowCreateOrg(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgs.map((org) => (
                <OrgCard
                  key={org.id}
                  {...org}
                  onClick={() => handleOrgClick(org.id)}
                />
              ))}
            </div>
          )}

          {/* AI Executive Briefing */}
          <ExecutiveSummary />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <PortfolioTrends orgs={orgs.map(o => ({ id: o.id, name: o.name }))} />
        </TabsContent>
      </Tabs>

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

      <QuickWorkspaceSetupDialog
        open={showQuickSetup}
        onOpenChange={setShowQuickSetup}
        onSuccess={(org) => setOrgs((prev) => [org, ...prev])}
      />
    </div>
    </ErrorBoundary>
  )
}
