"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

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

const CHART_COLORS = [
  "#1e293b", "#3b82f6", "#8b5cf6", "#06b6d4", "#f59e0b",
  "#ef4444", "#10b981", "#f97316", "#6366f1",
]

export function PortfolioTrends() {
  const [data, setData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTrends() {
      try {
        const res = await fetch("/api/super-admin/trends", {
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
    }
    fetchTrends()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  // Transform EOD trends into chart-friendly format (dates as x-axis, orgs as series)
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
    .map(([date, orgs]) => ({
      date: date.slice(5), // MM-DD
      ...orgs,
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
    .map(([weekStart, orgs]) => ({
      week: weekStart.slice(5),
      ...orgs,
    }))

  return (
    <div className="space-y-6">
      {/* EOD Submission Rate Trends */}
      {eodChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EOD Submission Rate (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={eodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} unit="%" />
                <Tooltip />
                <Legend />
                {orgNameList.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Task Completion Trends */}
      {taskChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks Completed Per Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {orgNameList.map((name, i) => (
                  <Bar
                    key={name}
                    dataKey={name}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
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
                  <div className="flex gap-4 text-xs text-slate-500">
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
