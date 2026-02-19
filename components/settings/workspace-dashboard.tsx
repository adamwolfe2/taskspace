"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Users,
  Zap,
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  Building2,
  BarChart3,
} from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"
import { UsageMeter } from "@/components/billing/usage-meter"
import { cn } from "@/lib/utils"

interface WorkspaceMetrics {
  members: {
    total: number
    active: number
    invited: number
  }
  usage: {
    tasksCreated: number
    rocksActive: number
    eodSubmittedToday: number
    eodSubmissionRate: number
  }
  subscription: {
    plan: string
    seatsUsed: number
    seatsLimit: number | null
    aiCreditsUsed: number
    aiCreditsLimit: number
  }
}

export function WorkspaceDashboard() {
  const { currentOrganization, currentUser } = useApp()
  const [metrics, setMetrics] = useState<WorkspaceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        // Fetch various metrics in parallel
        const [membersRes, usageRes, subscriptionRes] = await Promise.all([
          fetch("/api/members").then(r => r.json()),
          fetch("/api/dashboard/metrics").then(r => r.json()).catch(() => ({ success: false })),
          fetch("/api/billing/subscription").then(r => r.json()).catch(() => ({ success: false })),
        ])

        const members = membersRes.success ? membersRes.data : []
        const activeMembers = members.filter((m: { status: string }) => m.status === "active")
        const invitedMembers = members.filter((m: { status: string }) => m.status === "invited")

        // Get subscription data
        const subData = subscriptionRes.success ? subscriptionRes.data : null

        setMetrics({
          members: {
            total: members.length,
            active: activeMembers.length,
            invited: invitedMembers.length,
          },
          usage: {
            tasksCreated: usageRes.success ? usageRes.data?.tasksCreated || 0 : 0,
            rocksActive: usageRes.success ? usageRes.data?.rocksActive || 0 : 0,
            eodSubmittedToday: usageRes.success ? usageRes.data?.eodSubmittedToday || 0 : 0,
            eodSubmissionRate: activeMembers.length > 0
              ? Math.round(((usageRes.data?.eodSubmittedToday || 0) / activeMembers.length) * 100)
              : 0,
          },
          subscription: {
            plan: subData?.plan || currentOrganization?.subscription?.plan || "free",
            seatsUsed: activeMembers.length,
            seatsLimit: subData?.maxSeats || currentOrganization?.subscription?.maxUsers || null,
            aiCreditsUsed: 0,
            aiCreditsLimit: 0,
          },
        })
      } catch (err) {
        setError("Failed to load workspace metrics")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [currentOrganization])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" role="status" aria-label="Loading" />
        </CardContent>
      </Card>
    )
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-red-500">
          {error || "Failed to load metrics"}
        </CardContent>
      </Card>
    )
  }

  const seatUsagePercent = metrics.subscription.seatsLimit
    ? Math.round((metrics.subscription.seatsUsed / metrics.subscription.seatsLimit) * 100)
    : 0

  const planColors: Record<string, string> = {
    free: "bg-slate-500",
    starter: "bg-blue-500",
    professional: "bg-purple-500",
    enterprise: "bg-gradient-to-r from-amber-500 to-orange-500",
  }

  return (
    <div className="space-y-6">
      {/* Workspace Overview Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{currentOrganization?.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge className={cn("text-white", planColors[metrics.subscription.plan] || "bg-slate-500")}>
                    {metrics.subscription.plan.charAt(0).toUpperCase() + metrics.subscription.plan.slice(1)} Plan
                  </Badge>
                  <span className="text-slate-400">•</span>
                  <span>{metrics.members.active} active members</span>
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Team Members */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
              <Users className="h-4 w-4" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.members.active}</span>
              {metrics.members.invited > 0 && (
                <span className="text-sm text-slate-500">+{metrics.members.invited} invited</span>
              )}
            </div>
            {metrics.subscription.seatsLimit && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Seats used</span>
                  <span>{metrics.subscription.seatsUsed} / {metrics.subscription.seatsLimit}</span>
                </div>
                <Progress
                  value={seatUsagePercent}
                  className={cn(
                    "h-1.5",
                    seatUsagePercent >= 90 && "[&>div]:bg-red-500",
                    seatUsagePercent >= 75 && seatUsagePercent < 90 && "[&>div]:bg-amber-500"
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* EOD Submission Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
              <CheckCircle className="h-4 w-4" />
              Today's EOD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.usage.eodSubmissionRate}%</span>
              <span className="text-sm text-slate-500">submitted</span>
            </div>
            <div className="mt-3">
              <Progress
                value={metrics.usage.eodSubmissionRate}
                className={cn(
                  "h-1.5",
                  metrics.usage.eodSubmissionRate === 100 && "[&>div]:bg-emerald-500",
                  metrics.usage.eodSubmissionRate >= 75 && metrics.usage.eodSubmissionRate < 100 && "[&>div]:bg-blue-500",
                  metrics.usage.eodSubmissionRate < 75 && "[&>div]:bg-amber-500"
                )}
              />
              <p className="text-xs text-slate-500 mt-1">
                {metrics.usage.eodSubmittedToday} of {metrics.members.active} submitted
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Rocks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
              <TrendingUp className="h-4 w-4" />
              Active Rocks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.usage.rocksActive}</span>
              <span className="text-sm text-slate-500">this quarter</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Team goals in progress
            </p>
          </CardContent>
        </Card>

        {/* Tasks Created */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-slate-600">
              <Activity className="h-4 w-4" />
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{metrics.usage.tasksCreated}</span>
              <span className="text-sm text-slate-500">pending</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Assigned to team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI Usage Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <UsageMeter showCard={true} />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common workspace management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href="#team">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Invite Team Members
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href="#integrations">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Configure Integrations
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <a href="#billing">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Manage Subscription
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Warnings Section */}
      {(seatUsagePercent >= 90 || metrics.usage.eodSubmissionRate < 50) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Attention Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {seatUsagePercent >= 90 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                <Users className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Seat limit almost reached</p>
                  <p className="text-sm text-amber-700">
                    You're using {seatUsagePercent}% of your available seats. Consider upgrading to add more team members.
                  </p>
                </div>
              </div>
            )}
            {metrics.usage.eodSubmissionRate < 50 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Low EOD submission rate</p>
                  <p className="text-sm text-amber-700">
                    Only {metrics.usage.eodSubmissionRate}% of team members have submitted their EOD today.
                    Consider sending a reminder.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
