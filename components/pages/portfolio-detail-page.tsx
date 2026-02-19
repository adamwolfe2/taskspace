"use client"

import { useState, useEffect, useCallback } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { QuickActions } from "@/components/portfolio/quick-actions"
import {
  ArrowLeft, ExternalLink, Users, FileText, CheckSquare,
  AlertTriangle, Target, CheckCircle, Clock,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { ErrorBoundary } from "@/components/shared/error-boundary"

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

export function PortfolioDetailPage() {
  const { setCurrentPage, refreshSession } = useApp()
  const [data, setData] = useState<OrgDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setCurrentPage("portfolio")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Portfolio
        </Button>
        <div className="text-center py-12 text-red-600">{error || "Organization not found"}</div>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    "on-track": "bg-emerald-100 text-emerald-700",
    "at-risk": "bg-amber-100 text-amber-700",
    "blocked": "bg-red-100 text-red-700",
    "completed": "bg-slate-100 text-slate-600",
  }

  return (
    <ErrorBoundary>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage("portfolio")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{data.name}</h1>
            <p className="text-sm text-slate-500">{data.memberCount} members &middot; /{data.slug}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleSwitchToOrg}>
          <ExternalLink className="h-4 w-4 mr-1" />
          Switch to Org
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-xl font-bold">{data.stats.eodRateToday}%</div>
                <div className="text-xs text-slate-500">EOD Rate Today</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-indigo-500" />
              <div>
                <div className="text-xl font-bold">{data.stats.activeTaskCount}</div>
                <div className="text-xs text-slate-500">Active Tasks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              <div>
                <div className="text-xl font-bold">{data.stats.avgRockProgress}%</div>
                <div className="text-xs text-slate-500">Avg Rock Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className={cn("h-5 w-5", data.stats.openEscalationCount > 0 ? "text-red-500" : "text-slate-400")} />
              <div>
                <div className="text-xl font-bold">{data.stats.openEscalationCount}</div>
                <div className="text-xs text-slate-500">Escalations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <QuickActions
        orgId={data.id}
        orgName={data.name}
        missingEodMembers={data.members.filter((m) => !m.eodSubmittedToday)}
        openEscalationCount={data.stats.openEscalationCount}
        onRefresh={fetchDetail}
      />

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
                <p className="text-sm text-slate-500 text-center py-4">No active members</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rocks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Active Rocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.rocks.map((rock) => (
                <div key={rock.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{rock.title}</div>
                      <div className="text-xs text-slate-500">{rock.ownerName}</div>
                    </div>
                    <Badge className={cn("text-xs ml-2", statusColors[rock.status] || "bg-slate-100")}>
                      {rock.status}
                    </Badge>
                  </div>
                  <Progress value={rock.progress} className="h-1.5" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{rock.progress}%</span>
                    {rock.dueDate && <span>Due: {rock.dueDate}</span>}
                  </div>
                </div>
              ))}
              {data.rocks.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No active rocks</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent EODs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Recent EOD Reports (7 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recentEods.slice(0, 20).map((eod) => (
              <div key={eod.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  {eod.needsEscalation && (
                    <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <div>
                    <div className="text-sm font-medium">{eod.userName}</div>
                    <div className="text-xs text-slate-500">
                      {eod.date} &middot; {eod.taskCount} tasks reported
                    </div>
                  </div>
                </div>
                {eod.needsEscalation && eod.escalationNote && (
                  <div className="text-xs text-red-600 max-w-xs truncate">{eod.escalationNote}</div>
                )}
              </div>
            ))}
            {data.recentEods.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No EOD reports in the last 7 days</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  )
}
