"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import {
  Zap,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckSquare,
  Target,
  FileText,
  Smile,
  BarChart2,
  Users,
} from "lucide-react"
import type { PeopleVelocity } from "@/lib/types"

const WEEK_OPTIONS = [
  { label: "Last 4 weeks", value: "4" },
  { label: "Last 8 weeks", value: "8" },
  { label: "Last 12 weeks", value: "12" },
]

function getScoreColor(score: number): string {
  if (score >= 75) return "text-green-600"
  if (score >= 50) return "text-yellow-600"
  if (score >= 25) return "text-orange-500"
  return "text-red-500"
}

function getScoreBg(score: number): string {
  if (score >= 75) return "bg-green-500"
  if (score >= 50) return "bg-yellow-400"
  if (score >= 25) return "bg-orange-400"
  return "bg-red-400"
}

function getTrend(current: number, prev: number | undefined): "up" | "down" | "flat" {
  if (prev === undefined) return "flat"
  if (current > prev + 5) return "up"
  if (current < prev - 5) return "down"
  return "flat"
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-green-500" />
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-red-500" />
  return <Minus className="h-3 w-3 text-muted-foreground" />
}

function formatWeek(weekStart: string): string {
  const d = new Date(weekStart)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

interface UserVelocitySummary {
  userId: string
  weeks: PeopleVelocity[]
  currentWeek: PeopleVelocity | null
  prevWeek: PeopleVelocity | null
  avgScore: number
}

function groupByUser(velocities: PeopleVelocity[], weekCount: number): UserVelocitySummary[] {
  const byUser: Record<string, PeopleVelocity[]> = {}
  for (const v of velocities) {
    if (!byUser[v.userId]) byUser[v.userId] = []
    byUser[v.userId].push(v)
  }

  return Object.entries(byUser).map(([userId, weeks]) => {
    const sorted = [...weeks].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).slice(0, weekCount)
    const currentWeek = sorted[0] || null
    const prevWeek = sorted[1] || null
    const avgScore = sorted.length > 0
      ? Math.round(sorted.reduce((sum, w) => sum + w.metrics.velocityScore, 0) / sorted.length)
      : 0
    return { userId, weeks: sorted, currentWeek, prevWeek, avgScore }
  }).sort((a, b) => b.avgScore - a.avgScore)
}

function MemberCard({ summary, allWeeks }: { summary: UserVelocitySummary; allWeeks: string[] }) {
  const { currentWeek, prevWeek } = summary
  const m = currentWeek?.metrics

  const trend = getTrend(
    currentWeek?.metrics.velocityScore ?? 0,
    prevWeek?.metrics.velocityScore
  )

  return (
    <Card className="border-border">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{summary.userId}</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Week of {currentWeek ? formatWeek(currentWeek.weekStart) : "—"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <TrendIcon trend={trend} />
            <span className={`text-lg font-bold ${getScoreColor(summary.avgScore)}`}>
              {summary.avgScore}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Velocity bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Velocity Score</span>
            <span>{m?.velocityScore ?? 0}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getScoreBg(m?.velocityScore ?? 0)}`}
              style={{ width: `${m?.velocityScore ?? 0}%` }}
            />
          </div>
        </div>

        <Separator />

        {/* Metric grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5 text-xs">
            <CheckSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Tasks done</span>
            <span className="font-semibold ml-auto">{m?.tasksCompleted ?? 0}/{m?.tasksDue ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Rock hits</span>
            <span className="font-semibold ml-auto">{m?.rockMilestonesHit ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">EOD streak</span>
            <span className="font-semibold ml-auto">{m?.eodStreak ?? 0}d</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Smile className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Mood avg</span>
            <span className="font-semibold ml-auto">{m?.avgMood ?? 0}/5</span>
          </div>
        </div>

        {/* Sparkline for velocity trend across weeks */}
        {summary.weeks.length > 1 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Trend ({summary.weeks.length}w)</p>
            <div className="flex items-end gap-0.5 h-8">
              {[...summary.weeks].reverse().map((w, i) => {
                const h = Math.max(4, (w.metrics.velocityScore / 100) * 32)
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${getScoreBg(w.metrics.velocityScore)} opacity-80`}
                    style={{ height: `${h}px` }}
                    title={`${formatWeek(w.weekStart)}: ${w.metrics.velocityScore}`}
                  />
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PeopleVelocityPage() {
  const { currentWorkspace } = useWorkspaces()
  const [velocities, setVelocities] = useState<PeopleVelocity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [weeks, setWeeks] = useState("8")
  const [error, setError] = useState("")

  const workspaceId = currentWorkspace?.id

  const fetchVelocities = useCallback(async () => {
    if (!workspaceId) return
    setIsLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/people-velocity?workspaceId=${workspaceId}&weeks=${weeks}`)
      const data = await res.json()
      if (data.success) {
        setVelocities(data.data || [])
      } else {
        setError(data.error || "Failed to load velocity data")
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, weeks])

  useEffect(() => { fetchVelocities() }, [fetchVelocities])

  const handleRefresh = async () => {
    if (!workspaceId) return
    setIsRefreshing(true)
    try {
      // Trigger recompute for current user's current week
      await fetch("/api/people-velocity", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ workspaceId }),
      })
      await fetchVelocities()
    } catch {
      // ignore
    } finally {
      setIsRefreshing(false)
    }
  }

  const weekCount = parseInt(weeks, 10)
  const summaries = groupByUser(velocities, weekCount)

  const avgTeamScore = summaries.length > 0
    ? Math.round(summaries.reduce((s, u) => s + u.avgScore, 0) / summaries.length)
    : 0

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold">People Velocity</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Weekly execution metrics — task completion, rock progress, EOD consistency, and mood.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={weeks} onValueChange={setWeeks}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEK_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Team summary bar */}
        {summaries.length > 0 && (
          <Card className="border-border">
            <CardContent className="py-4 px-5">
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Team avg velocity</p>
                  <p className={`text-2xl font-bold ${getScoreColor(avgTeamScore)}`}>{avgTeamScore}<span className="text-sm font-normal text-muted-foreground">/100</span></p>
                </div>
                <Separator orientation="vertical" className="h-10 hidden sm:block" />
                <div>
                  <p className="text-xs text-muted-foreground">Members tracked</p>
                  <p className="text-2xl font-bold">{summaries.length}</p>
                </div>
                <Separator orientation="vertical" className="h-10 hidden sm:block" />
                <div>
                  <p className="text-xs text-muted-foreground">High performers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {summaries.filter(s => s.avgScore >= 75).length}
                  </p>
                </div>
                <Separator orientation="vertical" className="h-10 hidden sm:block" />
                <div>
                  <p className="text-xs text-muted-foreground">Need attention</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {summaries.filter(s => s.avgScore < 40 && s.currentWeek !== null).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Member grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchVelocities}>Try again</Button>
            </CardContent>
          </Card>
        ) : summaries.length === 0 ? (
          <Card className="border-dashed border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">No velocity data yet</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Velocity is computed from tasks, rocks, and EOD reports. Add team members and start submitting EODs to see metrics here.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh} disabled={isRefreshing}>
                {isRefreshing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                Compute now
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map(summary => (
              <MemberCard
                key={summary.userId}
                summary={summary}
                allWeeks={[]}
              />
            ))}
          </div>
        )}

        {/* How it works */}
        <Card className="border-border bg-muted/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <Zap className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">How velocity is calculated</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Velocity score (0–100) is a weighted composite: task completion rate (40%), EOD consistency (30%), rock milestone hits (20%), and mood average (10%). Scores are computed fresh for the current week and cached for historical weeks. Use the refresh button to recompute your personal score.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  )
}
