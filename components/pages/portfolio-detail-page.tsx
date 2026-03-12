"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MiniSparkline } from "@/components/portfolio/mini-sparkline"
import { OrgTrendChart } from "@/components/portfolio/org-trend-chart"
import {
  ArrowLeft, ExternalLink, Users, FileText, CheckSquare,
  AlertTriangle, Target, CheckCircle, Clock, Zap, Flame,
  TrendingUp, TrendingDown, Bell, UserPlus, ChevronDown, ChevronUp,
  Loader2, Mail,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { ErrorState } from "@/components/shared/error-state"
import { EmptyState } from "@/components/shared/empty-state"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface OrgMemberActivity {
  userId: string
  name: string
  email: string
  role: string
  eodSubmittedToday: boolean
  eodCount7Days: number
  activeTasks: number
  rockProgress: number
}

interface RecentEod {
  id: string
  userId: string
  userName: string
  date: string
  taskCount: number
  needsEscalation: boolean
  escalationNote: string | null
  submittedAt: string
}

interface OrgRock {
  id: string
  title: string
  ownerName: string
  progress: number
  status: string
  dueDate: string
}

interface OrgDetailData {
  id: string
  name: string
  slug: string
  memberCount: number
  members: OrgMemberActivity[]
  recentEods: RecentEod[]
  rocks: OrgRock[]
  stats: {
    eodRateToday: number
    activeTaskCount: number
    openEscalationCount: number
    avgRockProgress: number
  }
}

interface SnapshotPoint {
  snapshotDate: string
  eodSubmissionRate: number
  activeTaskCount: number
  completedTaskCount: number
  openEscalationCount: number
}

type RockFilter = "all" | "on-track" | "at-risk" | "blocked"

export function PortfolioDetailPage() {
  const { setCurrentPage, refreshSession } = useApp()
  const { toast } = useToast()
  const [data, setData] = useState<OrgDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<SnapshotPoint[]>([])
  const [metrics, setMetrics] = useState<{
    avgFocusScore: number
    focusScoreTrend: 'up' | 'down' | 'stable'
    topPerformers: { name: string; score: number; streak: number }[]
    memberEngagementRate: number
    streakLeaderboard: { name: string; currentStreak: number }[]
  } | null>(null)
  const [showAllRocks, setShowAllRocks] = useState(false)
  const [rockFilter, setRockFilter] = useState<RockFilter>("all")
  const [showOlderEods, setShowOlderEods] = useState(false)

  // Quick action state
  const [nudging, setNudging] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)

  const orgId = typeof window !== "undefined"
    ? sessionStorage.getItem("portfolio-detail-orgId")
    : null

  const fetchDetail = useCallback(async () => {
    if (!orgId) {
      setError("No organization selected")
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const res = await fetch(`/api/super-admin/orgs/${orgId}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.error || "Failed to load org details")
      }
    } catch {
      setError("Failed to load org details")
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    fetchDetail()
  }, [fetchDetail])

  // Fetch metrics + snapshots after main data loads
  useEffect(() => {
    if (!orgId || loading || !data) return

    fetch(`/api/super-admin/orgs/${orgId}/metrics`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Metrics fetch failed: ${res.status}`)
        return res.json()
      })
      .then((json) => { if (json.success) setMetrics(json.data) })
      .catch(() => {})

    fetch(`/api/super-admin/snapshots?days=14&orgId=${orgId}`, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Snapshots fetch failed: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (json.success) {
          setSnapshots(
            (json.data.snapshots as SnapshotPoint[])
              .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
          )
        }
      })
      .catch(() => {})
  }, [orgId, loading, data])

  const handleSwitchToOrg = async () => {
    if (!orgId) return
    try {
      const res = await fetch("/api/user/switch-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ organizationId: orgId }),
      })
      const json = await res.json()
      if (json.success) {
        await refreshSession()
        window.location.reload()
      }
    } catch {
      // Error handled by toast
    }
  }

  const handleNudge = async () => {
    if (!data) return
    const missing = data.members.filter((m) => !m.eodSubmittedToday)
    if (missing.length === 0) return
    setNudging(true)
    try {
      const res = await fetch(`/api/notifications/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          organizationId: orgId,
          userIds: missing.map((m) => m.userId),
          notification: { type: "eod_reminder", title: "EOD Report Reminder", message: "Please submit your End-of-Day report for today." },
        }),
      })
      const json = await res.json()
      toast({
        title: json.success ? "Nudge sent" : "Missing EODs",
        description: json.success
          ? `Reminded ${missing.length} team members to submit their EOD.`
          : `${missing.map((m) => m.name).join(", ")} haven't submitted today.`,
      })
    } catch {
      toast({ title: "Missing EODs", description: `${data.members.filter(m => !m.eodSubmittedToday).map((m) => m.name).join(", ")} haven't submitted today.` })
    } finally {
      setNudging(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return
    setInviteLoading(true)
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: "member", department: "General" }),
      })
      const json = await res.json()
      if (json.success) {
        toast({ title: "Invitation sent", description: `Invited ${inviteEmail} to ${data?.name}` })
        setInviteEmail("")
        setShowInvite(false)
        fetchDetail()
      } else {
        toast({ title: "Error", description: json.error || "Failed to send invite", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to send invite", variant: "destructive" })
    } finally {
      setInviteLoading(false)
    }
  }

  // Sparkline data from snapshots
  const eodSparkline = snapshots.map((s) => s.eodSubmissionRate)
  const taskSparkline = snapshots.map((s) => s.activeTaskCount)
  const completedSparkline = snapshots.map((s) => s.completedTaskCount)
  const escalationSparkline = snapshots.map((s) => s.openEscalationCount)

  // Filtered & sorted rocks
  const filteredRocks = useMemo(() => {
    if (!data) return []
    let rocks = [...data.rocks]
    if (rockFilter !== "all") {
      rocks = rocks.filter((r) => r.status === rockFilter)
    }
    // Sort: blocked first, at-risk, on-track, completed
    const order: Record<string, number> = { "blocked": 0, "at-risk": 1, "on-track": 2, "completed": 3 }
    rocks.sort((a, b) => (order[a.status] ?? 4) - (order[b.status] ?? 4))
    return rocks
  }, [data, rockFilter])

  const visibleRocks = showAllRocks ? filteredRocks : filteredRocks.slice(0, 5)

  // Group EODs by date
  const eodsByDate = useMemo(() => {
    if (!data) return new Map<string, RecentEod[]>()
    const map = new Map<string, RecentEod[]>()
    for (const eod of data.recentEods) {
      const group = map.get(eod.date) || []
      group.push(eod)
      map.set(eod.date, group)
    }
    return map
  }, [data])

  const eodDates = Array.from(eodsByDate.keys()).sort((a, b) => b.localeCompare(a))
  const visibleEodDates = showOlderEods ? eodDates : eodDates.slice(0, 7)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4 space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[350px] w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setCurrentPage("portfolio")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Portfolio
        </Button>
        <ErrorState
          title="Failed to load organization"
          message={error || "Organization not found"}
          onRetry={fetchDetail}
        />
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    "on-track": "bg-emerald-100 text-emerald-700",
    "at-risk": "bg-amber-100 text-amber-700",
    "blocked": "bg-red-100 text-red-700",
    "completed": "bg-slate-100 text-slate-600",
  }

  const missingEodCount = data.members.filter((m) => !m.eodSubmittedToday).length

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Header with inline quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage("portfolio")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.name}</h1>
            <p className="text-sm text-slate-500">{data.memberCount} members &middot; /{data.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-11 sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNudge}
            disabled={missingEodCount === 0 || nudging}
          >
            {nudging ? <Loader2 className="h-3 w-3 animate-spin sm:mr-1" /> : <Bell className="h-3 w-3 sm:mr-1" />}
            <span className="hidden sm:inline">Nudge ({missingEodCount})</span>
            <span className="sm:hidden">{missingEodCount}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-3 w-3 sm:mr-1" />
            <span className="hidden sm:inline">Invite</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleSwitchToOrg}>
            <ExternalLink className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Switch to Org</span>
          </Button>
        </div>
      </div>

      {/* Stat Cards with Sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-slate-500">EOD Rate Today</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-xl font-bold">{data.stats.eodRateToday}%</div>
              {eodSparkline.length > 1 && (
                <MiniSparkline data={eodSparkline} color="#3b82f6" width={80} height={24} />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="h-4 w-4 text-slate-500" />
              <span className="text-xs text-slate-500">Active Tasks</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-xl font-bold">{data.stats.activeTaskCount}</div>
              {taskSparkline.length > 1 && (
                <MiniSparkline data={taskSparkline} color="#6366f1" width={80} height={24} />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Avg Rock Progress</span>
            </div>
            <div className="flex items-end justify-between">
              <div className="text-xl font-bold">{data.stats.avgRockProgress}%</div>
              {completedSparkline.length > 1 && (
                <MiniSparkline data={completedSparkline} color="#059669" width={80} height={24} />
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className={cn("h-4 w-4", data.stats.openEscalationCount > 0 ? "text-red-500" : "text-slate-400")} />
              <span className="text-xs text-slate-500">Escalations</span>
            </div>
            <div className="flex items-end justify-between">
              <div className={cn("text-xl font-bold", data.stats.openEscalationCount > 0 && "text-red-600")}>
                {data.stats.openEscalationCount}
              </div>
              {escalationSparkline.length > 1 && (
                <MiniSparkline
                  data={escalationSparkline}
                  color={data.stats.openEscalationCount > 0 ? "#dc2626" : "#94a3b8"}
                  width={80}
                  height={24}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Org Trend Chart */}
      <OrgTrendChart orgId={data.id} orgName={data.name} />

      {/* Two-col: Team Activity + Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      member.eodSubmittedToday ? "bg-emerald-500" : "bg-slate-300"
                    )} />
                    <div>
                      <div className="text-sm font-medium">{member.name}</div>
                      <div className="text-xs text-slate-500">
                        {member.eodCount7Days}/7 EODs &middot; {member.activeTasks} tasks
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                    {member.eodSubmittedToday ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-slate-300" />
                    )}
                  </div>
                </div>
              ))}
              {data.members.length === 0 && (
                <EmptyState title="No active members" size="sm" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Team Performance: Focus + Streak merged */}
        {metrics ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" /> Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Focus Score side (60%) */}
                <div className="flex-[3] space-y-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-3xl font-bold">{metrics.avgFocusScore}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        Focus score
                        {metrics.focusScoreTrend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                        {metrics.focusScoreTrend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                      </div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">{metrics.memberEngagementRate}%</div>
                      <div className="text-xs text-slate-500">Engagement (7d)</div>
                    </div>
                  </div>
                  {metrics.topPerformers.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1.5">Top performers</div>
                      <div className="space-y-1">
                        {metrics.topPerformers.slice(0, 3).map((p, i) => (
                          <div key={p.name} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{i + 1}. {p.name}</span>
                            <span className="text-slate-500 text-xs">Score {p.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {/* Streak side (40%) */}
                <div className="flex-[2] border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                  <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                    <Flame className="h-3 w-3" /> Streak Leaderboard
                  </div>
                  <div className="space-y-1.5">
                    {metrics.streakLeaderboard.slice(0, 5).map((entry, i) => (
                      <div key={entry.name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-bold w-4 text-center",
                            i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : "text-slate-300"
                          )}>
                            {i + 1}
                          </span>
                          <span className="text-sm text-slate-700">{entry.name}</span>
                        </div>
                        <span className="text-xs font-medium tabular-nums">{entry.currentStreak}d</span>
                      </div>
                    ))}
                    {metrics.streakLeaderboard.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-2">No streak data</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6 pb-6">
              <EmptyState
                icon={Zap}
                title="Team metrics loading"
                description="Performance data will appear shortly."
                size="sm"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Rocks — full width */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Active Rocks
              <Badge variant="secondary" className="text-xs ml-1">{data.rocks.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-1 flex-wrap">
              {(["all", "on-track", "at-risk", "blocked"] as const).map((f) => (
                <Button
                  key={f}
                  variant={rockFilter === f ? "default" : "ghost"}
                  size="sm"
                  className="text-xs h-7 px-2.5"
                  onClick={() => { setRockFilter(f); setShowAllRocks(false) }}
                >
                  {f === "all" ? "All" : f === "on-track" ? "On Track" : f === "at-risk" ? "At Risk" : "Blocked"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRocks.length === 0 ? (
            <EmptyState
              icon={Target}
              title={rockFilter === "all" ? "No active rocks" : `No ${rockFilter} rocks`}
              size="sm"
            />
          ) : (
            <div className="space-y-2">
              {visibleRocks.map((rock) => (
                <div key={rock.id} className="flex items-center gap-2 sm:gap-4 py-2 border-b border-slate-100 last:border-0">
                  <Badge className={cn("text-[10px] flex-shrink-0 w-16 justify-center", statusColors[rock.status] || "bg-slate-100")}>
                    {rock.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{rock.title}</div>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0 hidden md:inline">{rock.ownerName}</span>
                  <div className="w-16 sm:w-24 flex-shrink-0">
                    <Progress value={rock.progress} className="h-1.5" />
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums w-8 text-right flex-shrink-0">{rock.progress}%</span>
                  {rock.dueDate && (
                    <span className="text-[10px] text-slate-400 flex-shrink-0 hidden lg:inline">{rock.dueDate}</span>
                  )}
                </div>
              ))}
              {filteredRocks.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-slate-500"
                  onClick={() => setShowAllRocks(!showAllRocks)}
                >
                  {showAllRocks ? (
                    <><ChevronUp className="h-3 w-3 mr-1" /> Show less</>
                  ) : (
                    <><ChevronDown className="h-3 w-3 mr-1" /> Show all {filteredRocks.length} rocks</>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent EODs — grouped by date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Recent EOD Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {eodDates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No EOD reports"
              description="No EOD reports in the last 7 days."
              size="sm"
            />
          ) : (
            <div className="space-y-4">
              {visibleEodDates.map((date) => {
                const eods = eodsByDate.get(date)!
                return (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {formatEodDate(date)}
                      </h4>
                      <Badge variant="secondary" className="text-[10px]">{eods.length} reports</Badge>
                    </div>
                    <div className="space-y-1">
                      {eods.map((eod) => (
                        <div
                          key={eod.id}
                          className={cn(
                            "flex items-center justify-between py-2 px-2 rounded-md",
                            eod.needsEscalation ? "bg-red-50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            {eod.needsEscalation && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                            )}
                            <div>
                              <div className="text-sm font-medium">{eod.userName}</div>
                              <div className="text-xs text-slate-500">{eod.taskCount} tasks reported</div>
                            </div>
                          </div>
                          {eod.needsEscalation && eod.escalationNote && (
                            <div className="text-xs text-red-600 max-w-xs truncate">{eod.escalationNote}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {eodDates.length > 7 && !showOlderEods && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-slate-500"
                  onClick={() => setShowOlderEods(true)}
                >
                  <ChevronDown className="h-3 w-3 mr-1" /> View older reports
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {/* Invite Dialog */}
    <Dialog open={showInvite} onOpenChange={setShowInvite}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to {data.name}</DialogTitle>
          <DialogDescription>Send an invitation to join this organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
            {inviteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Send Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </ErrorBoundary>
  )
}

function formatEodDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Today"
  if (diff === 1) return "Yesterday"
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}
