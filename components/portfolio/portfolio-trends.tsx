"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

interface TrendsData {
  eodTrends: Array<{
    orgId: string
    orgName: string
    date: string
    eodRate: number
  }>
  taskTrends: Array<{
    orgId: string
    orgName: string
    weekStart: string
    tasksCompleted: number
  }>
  rockSummary: Array<{
    orgId: string
    orgName: string
    avgProgress: number
    onTrack: number
    atRisk: number
    blocked: number
    completed: number
  }>
}

interface PortfolioTrendsProps {
  orgs: { id: string; name: string }[]
}

const CHART_COLORS = [
  "#1e293b", "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b",
  "#ef4444", "#10b981", "#f97316", "#6366f1",
]

const DATE_RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
]

export function PortfolioTrends({ orgs }: PortfolioTrendsProps) {
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState("30")
  const [orgFilter, setOrgFilter] = useState("all")

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ days })
      if (orgFilter !== "all") params.set("orgId", orgFilter)
      const res = await fetch(`/api/super-admin/trends?${params}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [days, orgFilter])

  useEffect(() => {
    fetchTrends()
  }, [fetchTrends])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Card>
          <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
          <CardContent><Skeleton className="h-[350px] w-full" /></CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  // Transform EOD trends
  const eodByDate = new Map<string, Record<string, number>>()
  const orgNames = new Set<string>()

  for (const point of data.eodTrends) {
    orgNames.add(point.orgName)
    if (!eodByDate.has(point.date)) {
      eodByDate.set(point.date, {})
    }
    eodByDate.get(point.date)![point.orgName] = point.eodRate
  }

  const eodChartData = Array.from(eodByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, orgsData]) => ({
      date: formatDateLabel(date),
      ...orgsData,
    }))

  const orgNameList = Array.from(orgNames)

  // Transform task trends
  const taskByWeek = new Map<string, Record<string, number>>()
  for (const point of data.taskTrends) {
    orgNames.add(point.orgName)
    if (!taskByWeek.has(point.weekStart)) {
      taskByWeek.set(point.weekStart, {})
    }
    taskByWeek.get(point.weekStart)![point.orgName] = point.tasksCompleted
  }

  const taskChartData = Array.from(taskByWeek.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, orgsData]) => ({
      week: formatDateLabel(weekStart),
      ...orgsData,
    }))

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-full sm:w-40" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-full sm:w-48" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Organizations</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* EOD Submission Rate */}
      {eodChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EOD Submission Rate ({days}d)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={eodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                {orgNameList.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tasks Completed Per Week - grouped bars (no stacked radius issue) */}
      {taskChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks Completed Per Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={taskChartData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                {orgNameList.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rock Summary */}
      {data.rockSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rock Status by Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.rockSummary.map((org) => (
                <div key={org.orgId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{org.orgName}</span>
                    <span className="text-sm text-slate-500">{org.avgProgress}% avg</span>
                  </div>
                  <div className="flex gap-1 h-6">
                    {org.onTrack > 0 && (
                      <div
                        className="bg-emerald-500 rounded-sm flex items-center justify-center text-white text-xs"
                        style={{ flex: org.onTrack }}
                        title={`${org.onTrack} on track`}
                      >
                        {org.onTrack}
                      </div>
                    )}
                    {org.atRisk > 0 && (
                      <div
                        className="bg-amber-500 rounded-sm flex items-center justify-center text-white text-xs"
                        style={{ flex: org.atRisk }}
                        title={`${org.atRisk} at risk`}
                      >
                        {org.atRisk}
                      </div>
                    )}
                    {org.blocked > 0 && (
                      <div
                        className="bg-red-500 rounded-sm flex items-center justify-center text-white text-xs"
                        style={{ flex: org.blocked }}
                        title={`${org.blocked} blocked`}
                      >
                        {org.blocked}
                      </div>
                    )}
                    {org.completed > 0 && (
                      <div
                        className="bg-slate-300 rounded-sm flex items-center justify-center text-slate-600 text-xs"
                        style={{ flex: org.completed }}
                        title={`${org.completed} completed`}
                      >
                        {org.completed}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> On Track: {org.onTrack}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> At Risk: {org.atRisk}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> Blocked: {org.blocked}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-300" /> Done: {org.completed}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
