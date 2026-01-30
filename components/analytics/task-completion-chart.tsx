"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { CheckCircle2 } from "lucide-react"

interface TaskCompletionChartProps {
  data: Array<{
    date: string
    completed: number
    created: number
  }>
}

export function TaskCompletionChart({ data }: TaskCompletionChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-50 p-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle>Task Activity</CardTitle>
            <CardDescription>Tasks created vs completed over time</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
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
              />
              <Legend
                wrapperStyle={{ paddingTop: "10px" }}
                iconType="circle"
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke="#94a3b8"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCreated)"
                name="Tasks Created"
              />
              <Area
                type="monotone"
                dataKey="completed"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCompleted)"
                name="Tasks Completed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
