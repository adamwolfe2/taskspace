"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { FeatureGate } from "@/components/shared/feature-gate"
import { LayoutGrid, Target, CheckSquare, FileText, Heart, Loader2 } from "lucide-react"

interface WorkspaceSummary {
  workspaceId: string
  workspaceName: string
  rocks: { total: number; completed: number }
  tasks: { total: number; completed: number }
  eodCount: number
  healthScore?: number
}

export function CrossWorkspacePage() {
  const [summaries, setSummaries] = useState<WorkspaceSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSummaries() {
      try {
        const res = await fetch("/api/cross-workspace/summary")
        const data = await res.json()
        if (data.success) setSummaries(data.data || [])
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchSummaries()
  }, [])

  const totals = summaries.reduce(
    (acc, s) => ({
      rocks: acc.rocks + s.rocks.total,
      rocksCompleted: acc.rocksCompleted + s.rocks.completed,
      tasks: acc.tasks + s.tasks.total,
      tasksCompleted: acc.tasksCompleted + s.tasks.completed,
      eods: acc.eods + s.eodCount,
    }),
    { rocks: 0, rocksCompleted: 0, tasks: 0, tasksCompleted: 0, eods: 0 }
  )

  const avgHealth = summaries.length > 0
    ? Math.round(summaries.reduce((sum, s) => sum + (s.healthScore || 0), 0) / summaries.length)
    : 0

  return (
    <FeatureGate feature="advanced.crossWorkspace">
      <ErrorBoundary>
        <div className="space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Cross-Workspace Dashboard</h1>
            <p className="text-sm text-slate-500 mt-1">Overview across all your workspaces</p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : summaries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No workspace data available</p>
                <p className="text-sm">This dashboard requires 2+ workspaces with active data</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Aggregate Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold">{summaries.length}</p>
                    <p className="text-xs text-muted-foreground">Workspaces</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold">{totals.rocksCompleted}/{totals.rocks}</p>
                    <p className="text-xs text-muted-foreground">Rocks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold">{totals.tasksCompleted}/{totals.tasks}</p>
                    <p className="text-xs text-muted-foreground">Tasks</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold">{totals.eods}</p>
                    <p className="text-xs text-muted-foreground">EODs This Week</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="py-4 text-center">
                    <p className="text-2xl font-bold">{avgHealth || "—"}</p>
                    <p className="text-xs text-muted-foreground">Avg Health</p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-Workspace Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summaries.map(summary => {
                  const rockPct = summary.rocks.total > 0
                    ? Math.round((summary.rocks.completed / summary.rocks.total) * 100) : 0
                  const taskPct = summary.tasks.total > 0
                    ? Math.round((summary.tasks.completed / summary.tasks.total) * 100) : 0

                  return (
                    <Card key={summary.workspaceId}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{summary.workspaceName}</CardTitle>
                          {summary.healthScore != null && (
                            <Badge variant={summary.healthScore >= 70 ? "default" : summary.healthScore >= 50 ? "secondary" : "destructive"}>
                              <Heart className="h-3 w-3 mr-1" />{summary.healthScore}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Rocks</span>
                              <span className="text-muted-foreground">{summary.rocks.completed}/{summary.rocks.total}</span>
                            </div>
                            <Progress value={rockPct} className="h-1.5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span>Tasks</span>
                              <span className="text-muted-foreground">{summary.tasks.completed}/{summary.tasks.total}</span>
                            </div>
                            <Progress value={taskPct} className="h-1.5" />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm">{summary.eodCount} EODs this week</span>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </ErrorBoundary>
    </FeatureGate>
  )
}
