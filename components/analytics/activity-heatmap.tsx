"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Activity } from "lucide-react"

interface ActivityHeatmapProps {
  data: Array<{
    day: string
    avgTasks: number
    avgReports: number
  }>
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
  // Ensure days are in correct order
  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const sortedData = dayOrder
    .map((day) => data.find((d) => d.day === day))
    .filter((d) => d !== undefined) as Array<{
      day: string
      avgTasks: number
      avgReports: number
    }>

  // Shorten day names for better display
  const displayData = sortedData.map((item) => ({
    ...item,
    day: item.day.slice(0, 3), // Mon, Tue, Wed, etc.
  }))

  if (sortedData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-slate-50 p-2">
              <Activity className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Activity by Day of Week</CardTitle>
              <CardDescription>Average team activity patterns</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No activity data available yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-50 p-2">
            <Activity className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <CardTitle>Activity by Day of Week</CardTitle>
            <CardDescription>Average team activity patterns</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="day"
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickLine={{ stroke: "#e2e8f0" }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                cursor={{ fill: "rgba(99, 102, 241, 0.1)" }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                iconType="circle"
              />
              <Bar
                dataKey="avgTasks"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                name="Avg Tasks"
              />
              <Bar
                dataKey="avgReports"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
                name="Avg Reports"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
