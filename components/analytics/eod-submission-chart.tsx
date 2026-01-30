"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Calendar } from "lucide-react"

interface EODSubmissionChartProps {
  data: Array<{
    date: string
    submissions: number
  }>
}

export function EODSubmissionChart({ data }: EODSubmissionChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-purple-50 p-2">
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <CardTitle>EOD Report Submissions</CardTitle>
            <CardDescription>Daily accountability report activity</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                cursor={{ fill: "rgba(139, 92, 246, 0.1)" }}
              />
              <Bar
                dataKey="submissions"
                fill="rgb(139 92 246)"
                radius={[6, 6, 0, 0]}
                name="Reports Submitted"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
