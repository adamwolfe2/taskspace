"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface SnapshotPoint {
  snapshotDate: string
  eodSubmissionRate: number
  activeTaskCount: number
  openEscalationCount: number
}

interface OrgTrendChartProps {
  orgId: string
  orgName: string
}

export function OrgTrendChart({ orgId, orgName }: OrgTrendChartProps) {
  const [data, setData] = useState<SnapshotPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSnapshots() {
      try {
        const res = await fetch(`/api/super-admin/snapshots?days=30&orgId=${orgId}`, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
        const json = await res.json()
        if (json.success) {
          setData(
            (json.data.snapshots as SnapshotPoint[])
              .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
          )
        }
      } catch {
        // Non-blocking
      } finally {
        setLoading(false)
      }
    }
    fetchSnapshots()
  }, [orgId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (data.length < 2) return null

  const chartData = data.map((d) => ({
    date: d.snapshotDate.slice(5), // MM-DD
    "EOD Rate": Math.round(d.eodSubmissionRate),
    "Active Tasks": d.activeTaskCount,
    "Escalations": d.openEscalationCount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {orgName} &mdash; 30-Day Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
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
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
            />
            <Line
              type="monotone"
              dataKey="EOD Rate"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Active Tasks"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Escalations"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
