"use client"

import { useMemo } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts"
import { Clock, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDuration, getCategoryInfo } from "@/lib/productivity/calculations"
import type { FocusBlockCategory } from "@/lib/types"

interface DailyHours {
  date: string
  dayLabel: string // "Mon", "Tue", etc.
  totalMinutes: number
  byCategory: Partial<Record<FocusBlockCategory, number>>
}

interface WeeklyHoursChartProps {
  data: DailyHours[]
  goalMinutesPerDay?: number
  averageMinutesPerDay?: number
  showCategoryBreakdown?: boolean
  className?: string
}

const CATEGORY_COLORS: Record<FocusBlockCategory, string> = {
  deep_work: "#6366F1",   // Indigo
  meetings: "#3B82F6",    // Blue
  admin: "#6B7280",       // Gray
  collaboration: "#10B981", // Emerald
  learning: "#F59E0B",    // Amber
  planning: "#8B5CF6",    // Purple
}

export function WeeklyHoursChart({
  data,
  goalMinutesPerDay,
  averageMinutesPerDay,
  showCategoryBreakdown = false,
  className,
}: WeeklyHoursChartProps) {
  const totalWeekMinutes = useMemo(
    () => data.reduce((sum, d) => sum + d.totalMinutes, 0),
    [data]
  )

  const avgMinutes = useMemo(
    () => Math.round(totalWeekMinutes / data.filter((d) => d.totalMinutes > 0).length) || 0,
    [data, totalWeekMinutes]
  )

  const maxMinutes = useMemo(
    () => Math.max(...data.map((d) => d.totalMinutes), goalMinutesPerDay || 0),
    [data, goalMinutesPerDay]
  )

  // Calculate trend vs previous average
  const trend = useMemo(() => {
    if (!averageMinutesPerDay) return "stable"
    const diff = avgMinutes - averageMinutesPerDay
    if (diff > 15) return "up"
    if (diff < -15) return "down"
    return "stable"
  }, [avgMinutes, averageMinutesPerDay])

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-amber-500" : "text-slate-400"

  // Prepare data for stacked bars if showing category breakdown
  const chartData = useMemo(() => {
    if (!showCategoryBreakdown) {
      return data.map((d) => ({
        ...d,
        hours: Math.round((d.totalMinutes / 60) * 10) / 10,
      }))
    }

    return data.map((d) => ({
      ...d,
      hours: Math.round((d.totalMinutes / 60) * 10) / 10,
      deep_work: d.byCategory.deep_work ? Math.round((d.byCategory.deep_work / 60) * 10) / 10 : 0,
      meetings: d.byCategory.meetings ? Math.round((d.byCategory.meetings / 60) * 10) / 10 : 0,
      admin: d.byCategory.admin ? Math.round((d.byCategory.admin / 60) * 10) / 10 : 0,
      collaboration: d.byCategory.collaboration ? Math.round((d.byCategory.collaboration / 60) * 10) / 10 : 0,
      learning: d.byCategory.learning ? Math.round((d.byCategory.learning / 60) * 10) / 10 : 0,
      planning: d.byCategory.planning ? Math.round((d.byCategory.planning / 60) * 10) / 10 : 0,
    }))
  }, [data, showCategoryBreakdown])

  const goalHours = goalMinutesPerDay ? Math.round((goalMinutesPerDay / 60) * 10) / 10 : null

  return (
    <div className={cn("bg-white rounded-xl border border-slate-100 shadow-sm p-5", className)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            Weekly Focus Hours
          </h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-slate-900">
              {formatDuration(totalWeekMinutes)}
            </span>
            <span className="text-sm text-slate-500">total</span>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <TrendIcon className={cn("h-4 w-4", trendColor)} />
            <span className={cn("text-sm font-medium", trendColor)}>
              {formatDuration(avgMinutes)}/day
            </span>
          </div>
          {averageMinutesPerDay && (
            <span className="text-xs text-slate-500">
              vs {formatDuration(averageMinutesPerDay)} avg
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap="20%">
            <XAxis
              dataKey="dayLabel"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#64748B" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              tickFormatter={(value) => `${value}h`}
              domain={[0, Math.ceil((maxMinutes / 60) * 1.2)]}
              width={35}
            />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload?.length) return null
                const data = payload[0].payload as DailyHours & { hours: number }
                return (
                  <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 min-w-[140px]">
                    <p className="font-medium text-slate-900 mb-1">{label}</p>
                    <p className="text-sm text-slate-600">
                      Total: <span className="font-semibold">{formatDuration(data.totalMinutes)}</span>
                    </p>
                    {showCategoryBreakdown && Object.entries(data.byCategory).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                        {Object.entries(data.byCategory).map(([cat, mins]) => {
                          const info = getCategoryInfo(cat)
                          return (
                            <div key={cat} className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">{info.label}</span>
                              <span className="font-medium">{formatDuration(mins as number)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }}
            />

            {/* Goal line */}
            {goalHours && (
              <ReferenceLine
                y={goalHours}
                stroke="#DC2626"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Goal",
                  position: "right",
                  fill: "#DC2626",
                  fontSize: 10,
                }}
              />
            )}

            {showCategoryBreakdown ? (
              <>
                <Bar dataKey="deep_work" stackId="a" fill={CATEGORY_COLORS.deep_work} radius={[0, 0, 0, 0]} />
                <Bar dataKey="meetings" stackId="a" fill={CATEGORY_COLORS.meetings} radius={[0, 0, 0, 0]} />
                <Bar dataKey="collaboration" stackId="a" fill={CATEGORY_COLORS.collaboration} radius={[0, 0, 0, 0]} />
                <Bar dataKey="admin" stackId="a" fill={CATEGORY_COLORS.admin} radius={[0, 0, 0, 0]} />
                <Bar dataKey="learning" stackId="a" fill={CATEGORY_COLORS.learning} radius={[0, 0, 0, 0]} />
                <Bar dataKey="planning" stackId="a" fill={CATEGORY_COLORS.planning} radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      goalMinutesPerDay && entry.totalMinutes >= goalMinutesPerDay
                        ? "#10B981"
                        : "#DC2626"
                    }
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category legend */}
      {showCategoryBreakdown && (
        <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
            const info = getCategoryInfo(cat)
            return (
              <div key={cat} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-600">{info.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Compact mini chart for dashboard
export function WeeklyHoursMini({
  totalHours,
  trend,
  className,
}: {
  totalHours: number
  trend?: "up" | "down" | "stable"
  className?: string
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-amber-500" : "text-slate-400"

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
        <Clock className="h-5 w-5 text-red-600" />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900">{totalHours.toFixed(1)}h</span>
          <span className="text-xs text-slate-500">this week</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={cn("h-3 w-3", trendColor)} />
          <span className={cn("text-xs", trendColor)}>
            {trend === "up" ? "More focus time" : trend === "down" ? "Less focus time" : "Consistent"}
          </span>
        </div>
      </div>
    </div>
  )
}
