"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Target } from "lucide-react"

interface RockCompletionChartProps {
  data: Array<{
    date: string
    completed: number
  }>
}

export function RockCompletionChart({ data }: RockCompletionChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-2">
            <Target className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Rock Completion Trend</CardTitle>
            <CardDescription>Quarterly goals completed over time</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
              <Line
                type="monotone"
                dataKey="completed"
                stroke="rgb(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "rgb(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
                name="Rocks Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
