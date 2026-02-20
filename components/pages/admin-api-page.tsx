"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Activity, Zap, Clock, TrendingUp, Server, Building2 } from "lucide-react"

interface UsageSummary {
  totalCredits: number
  totalTokens: number
  totalCalls: number
  creditsToday: number
  callsToday: number
  creditsLimit: number
  remainingCredits: number
}

interface DailyTrend {
  date: string
  calls: number
  credits: number
  tokens: number
}

interface ActionBreakdown {
  action: string
  calls: number
  credits: number
  avgTokens: number
}

interface ModelBreakdown {
  model: string
  calls: number
  credits: number
  avgInputTokens: number
  avgOutputTokens: number
}

interface OrgBreakdown {
  organizationId: string
  organizationName: string
  calls: number
  credits: number
  plan: string
}

interface RecentCall {
  id: string
  action: string
  model: string
  inputTokens: number
  outputTokens: number
  creditsUsed: number
  createdAt: string
  organizationName: string
}

interface DashboardData {
  summary: UsageSummary
  dailyTrend: DailyTrend[]
  byAction: ActionBreakdown[]
  byModel: ModelBreakdown[]
  byOrganization: OrgBreakdown[]
  recentCalls: RecentCall[]
  isSuperAdmin: boolean
}

function formatNumber(n: number): string {
  if (n === Infinity) return "Unlimited"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

function ActionLabel({ action }: { action: string }) {
  const labels: Record<string, { label: string; color: string }> = {
    brain_dump: { label: "Brain Dump", color: "bg-purple-100 text-purple-800" },
    eod_parse: { label: "EOD Parse", color: "bg-blue-100 text-blue-800" },
    digest: { label: "Daily Digest", color: "bg-green-100 text-green-800" },
    query: { label: "AI Query", color: "bg-amber-100 text-amber-800" },
    meeting_prep: { label: "Meeting Prep", color: "bg-pink-100 text-pink-800" },
    meeting_notes: { label: "Meeting Notes", color: "bg-indigo-100 text-indigo-800" },
    scorecard_insights: { label: "Scorecard", color: "bg-cyan-100 text-cyan-800" },
    manager_insights: { label: "Manager Insights", color: "bg-orange-100 text-orange-800" },
    prioritize: { label: "Prioritize", color: "bg-teal-100 text-teal-800" },
    task_suggestion: { label: "Task Suggestion", color: "bg-lime-100 text-lime-800" },
  }
  const config = labels[action] || { label: action, color: "bg-slate-100 text-slate-800" }
  return <Badge variant="outline" className={`${config.color} border-0 text-xs`}>{config.label}</Badge>
}

// Simple bar chart using CSS
function TrendChart({ data }: { data: DailyTrend[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No data yet</p>
  const maxCredits = Math.max(...data.map(d => d.credits), 1)

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((day) => (
        <div key={day.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full flex flex-col items-center">
            <span className="text-[10px] text-muted-foreground mb-1">{day.credits}</span>
            <div
              className="w-full bg-primary/80 rounded-t min-h-[2px] transition-all"
              style={{ height: `${Math.max((day.credits / maxCredits) * 80, 2)}px` }}
            />
          </div>
          <span className="text-[9px] text-muted-foreground truncate w-full text-center">
            {formatDate(day.date)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function AdminApiPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState("30")

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/admin/ai-usage?days=${days}`, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
        const result = await response.json()
        if (!result.success) throw new Error(result.error)
        setData(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [days])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-destructive">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const { summary, dailyTrend, byAction, byModel, byOrganization, recentCalls, isSuperAdmin } = data
  const usagePercent = summary.creditsLimit === Infinity
    ? 0
    : Math.round(((summary.creditsLimit - summary.remainingCredits) / summary.creditsLimit) * 100)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Usage Monitor</h2>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? "Cross-organization AI usage & costs" : "Your organization's AI usage & costs"}
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Credits Used</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(summary.totalCredits)}</p>
            <p className="text-xs text-muted-foreground">
              {summary.creditsLimit === Infinity
                ? "Unlimited plan"
                : `${formatNumber(summary.remainingCredits)} remaining (${usagePercent}% used)`
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Calls</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(summary.totalCalls)}</p>
            <p className="text-xs text-muted-foreground">{summary.callsToday} today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Tokens</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(summary.totalTokens)}</p>
            <p className="text-xs text-muted-foreground">
              ~{formatNumber(Math.round(summary.totalTokens / Math.max(summary.totalCalls, 1)))} avg/call
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Today</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(summary.creditsToday)}</p>
            <p className="text-xs text-muted-foreground">{summary.callsToday} API calls</p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Usage Bar */}
      {summary.creditsLimit !== Infinity && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Monthly Credit Usage</span>
              <span className="text-sm text-muted-foreground">
                {formatNumber(summary.creditsLimit - summary.remainingCredits)} / {formatNumber(summary.creditsLimit)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-green-500"
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Daily Usage Trend
          </CardTitle>
          <CardDescription>Credits consumed per day</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={dailyTrend} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* By Action */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Action</CardTitle>
            <CardDescription>Which AI features are used most</CardDescription>
          </CardHeader>
          <CardContent>
            {byAction.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No usage data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Avg Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byAction.map((row) => (
                    <TableRow key={row.action}>
                      <TableCell><ActionLabel action={row.action} /></TableCell>
                      <TableCell className="text-right">{formatNumber(row.calls)}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(row.credits)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatNumber(row.avgTokens)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* By Model */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Model</CardTitle>
            <CardDescription>Token usage per AI model</CardDescription>
          </CardHeader>
          <CardContent>
            {byModel.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No usage data yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Avg In/Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byModel.map((row) => (
                    <TableRow key={row.model}>
                      <TableCell>
                        <span className="font-mono text-xs">{row.model}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(row.calls)}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(row.credits)}</TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {formatNumber(row.avgInputTokens)} / {formatNumber(row.avgOutputTokens)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By Organization (super-admin or single org) */}
      {byOrganization.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {isSuperAdmin ? "Usage by Organization" : "Organization Usage"}
            </CardTitle>
            <CardDescription>
              {isSuperAdmin ? "Which organizations are consuming the most credits" : "Your organization's usage"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byOrganization.map((row) => (
                  <TableRow key={row.organizationId}>
                    <TableCell className="font-medium">{row.organizationName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{row.plan}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(row.calls)}</TableCell>
                    <TableCell className="text-right font-medium">{formatNumber(row.credits)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Calls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent API Calls</CardTitle>
          <CardDescription>Last 50 AI operations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No API calls recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Model</TableHead>
                    {isSuperAdmin && <TableHead>Org</TableHead>}
                    <TableHead className="text-right">In Tokens</TableHead>
                    <TableHead className="text-right">Out Tokens</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTime(call.createdAt)}
                      </TableCell>
                      <TableCell><ActionLabel action={call.action} /></TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{call.model}</span>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-xs">{call.organizationName}</TableCell>
                      )}
                      <TableCell className="text-right text-xs">{formatNumber(call.inputTokens)}</TableCell>
                      <TableCell className="text-right text-xs">{formatNumber(call.outputTokens)}</TableCell>
                      <TableCell className="text-right font-medium">{call.creditsUsed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
