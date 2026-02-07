"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Target, CheckCircle2 } from "lucide-react"

interface GoalVsActualChartProps {
  data: {
    rocksPlanned: number
    rocksCompleted: number
    tasksCreated: number
    tasksCompleted: number
  }
}

export function GoalVsActualChart({ data }: GoalVsActualChartProps) {
  const categories = [
    {
      label: "Rocks",
      planned: data.rocksPlanned,
      actual: data.rocksCompleted,
      icon: Target,
      color: "bg-blue-500",
      lightColor: "bg-blue-200",
    },
    {
      label: "Tasks",
      planned: data.tasksCreated,
      actual: data.tasksCompleted,
      icon: CheckCircle2,
      color: "bg-emerald-500",
      lightColor: "bg-emerald-200",
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Goal vs Actual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map((cat) => {
            const Icon = cat.icon
            const percentage = cat.planned > 0 ? Math.round((cat.actual / cat.planned) * 100) : 0
            const plannedWidth = 100
            const actualWidth = cat.planned > 0 ? Math.min((cat.actual / cat.planned) * 100, 100) : 0

            return (
              <div key={cat.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">{cat.label}</span>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold",
                    percentage >= 80 ? "text-emerald-600" : percentage >= 50 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {percentage}%
                  </span>
                </div>

                <div className="space-y-1">
                  {/* Planned bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-16">Planned</span>
                    <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", cat.lightColor)}
                        style={{ width: `${plannedWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-8 text-right">{cat.planned}</span>
                  </div>

                  {/* Actual bar */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-16">Actual</span>
                    <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", cat.color)}
                        style={{ width: `${actualWidth}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-600 w-8 text-right">{cat.actual}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
