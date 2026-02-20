"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Target, CheckCircle2, Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricsOverviewProps {
  metrics: {
    rockCompletionRate: number
    taskCompletionRate: number
    eodCompletionRate: number
    totalRocks: number
    completedRocks: number
    totalTasks: number
    completedTasks: number
    totalReports: number
  }
  previousMetrics?: {
    rockCompletionRate: number
    taskCompletionRate: number
    eodCompletionRate: number
  }
}

export function MetricsOverview({ metrics, previousMetrics }: MetricsOverviewProps) {
  const getChange = (current: number, previous?: number) => {
    if (previous === undefined || previous === 0) return null
    return Math.round(current - previous)
  }

  const stats = [
    {
      label: "Rock Completion",
      value: `${metrics.rockCompletionRate}%`,
      subtitle: `${metrics.completedRocks} of ${metrics.totalRocks} completed`,
      icon: Target,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      trend: metrics.rockCompletionRate >= 70 ? "up" : metrics.rockCompletionRate >= 50 ? "neutral" : "down",
      change: getChange(metrics.rockCompletionRate, previousMetrics?.rockCompletionRate),
    },
    {
      label: "Task Completion",
      value: `${metrics.taskCompletionRate}%`,
      subtitle: `${metrics.completedTasks} of ${metrics.totalTasks} completed`,
      icon: CheckCircle2,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      trend: metrics.taskCompletionRate >= 70 ? "up" : metrics.taskCompletionRate >= 50 ? "neutral" : "down",
      change: getChange(metrics.taskCompletionRate, previousMetrics?.taskCompletionRate),
    },
    {
      label: "EOD Submission Rate",
      value: `${metrics.eodCompletionRate}%`,
      subtitle: `${metrics.totalReports} reports submitted`,
      icon: Calendar,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      trend: metrics.eodCompletionRate >= 80 ? "up" : metrics.eodCompletionRate >= 60 ? "neutral" : "down",
      change: getChange(metrics.eodCompletionRate, previousMetrics?.eodCompletionRate),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon
        const showTrend = stat.trend !== "neutral"

        return (
          <Card key={stat.label} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 mb-1">
                    {stat.label}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-bold text-slate-900">
                      {stat.value}
                    </h3>
                    {showTrend && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 text-sm font-medium",
                          stat.trend === "up" ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {stat.trend === "up" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        {stat.change !== null && stat.change !== undefined && (
                          <span className="text-xs">
                            {stat.change > 0 ? "+" : ""}{stat.change}%
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{stat.subtitle}</p>
                </div>
                <div className={cn("rounded-xl p-3", stat.bgColor)}>
                  <Icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
