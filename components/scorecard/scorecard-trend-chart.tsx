"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"

interface ScorecardTrendChartProps {
  trends: {
    weeks: string[]
    metrics: Array<{
      metric: {
        id: string
        name: string
        targetValue?: number
        targetDirection: string
        unit: string
        ownerName?: string
      }
      entries: Record<string, { value: number; status: string } | null>
    }>
  } | null
  loading?: boolean
}

export function ScorecardTrendChart({ trends, loading }: ScorecardTrendChartProps) {
  const { getStatusStyle } = useBrandStatusStyles()
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)

  const selectedMetric = useMemo(() => {
    if (!trends || !selectedMetricId) return null
    return trends.metrics.find((m) => m.metric.id === selectedMetricId) || null
  }, [trends, selectedMetricId])

  // Auto-select first metric when trends load
  useMemo(() => {
    if (trends && trends.metrics.length > 0 && !selectedMetricId) {
      setSelectedMetricId(trends.metrics[0].metric.id)
    }
  }, [trends, selectedMetricId])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>13-Week Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Loading trends...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!trends || trends.metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>13-Week Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No metrics available
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!selectedMetric) {
    return null
  }

  // Prepare chart data
  const chartData = trends.weeks.map((week) => {
    const entry = selectedMetric.entries[week]
    return {
      week,
      value: entry?.value ?? null,
      status: entry?.status ?? null,
    }
  })

  // Calculate min/max for Y-axis
  const values = chartData
    .map((d) => d.value)
    .filter((v): v is number => v !== null)

  const targetValue = selectedMetric.metric.targetValue

  const allValues = targetValue !== undefined ? [...values, targetValue] : values

  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100

  // Add 10% padding to min/max
  const padding = (maxValue - minValue) * 0.1 || 10
  const yMin = minValue - padding
  const yMax = maxValue + padding

  // SVG dimensions
  const width = 400
  const height = 200
  const chartPadding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - chartPadding.left - chartPadding.right
  const chartHeight = height - chartPadding.top - chartPadding.bottom

  // Scale functions
  const scaleX = (index: number) => {
    return chartPadding.left + (index / (trends.weeks.length - 1)) * chartWidth
  }

  const scaleY = (value: number) => {
    const normalized = (value - yMin) / (yMax - yMin)
    return chartPadding.top + chartHeight - normalized * chartHeight
  }

  // Build polyline points
  const points = chartData
    .map((d, i) => {
      if (d.value === null) return null
      return `${scaleX(i)},${scaleY(d.value)}`
    })
    .filter((p): p is string => p !== null)
    .join(" ")

  // Format week labels (e.g., "Jan 6")
  const formatWeek = (weekString: string) => {
    const date = new Date(weekString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date)
  }

  // Calculate trend
  const firstValue = values[0]
  const lastValue = values[values.length - 1]
  let trendIcon = <Minus className="h-4 w-4" />
  let trendColor = "text-muted-foreground"

  if (firstValue !== undefined && lastValue !== undefined) {
    const change = lastValue - firstValue
    if (Math.abs(change) < 0.01) {
      trendIcon = <Minus className="h-4 w-4" />
      trendColor = "text-muted-foreground"
    } else if (
      (selectedMetric.metric.targetDirection === "increase" && change > 0) ||
      (selectedMetric.metric.targetDirection === "decrease" && change < 0)
    ) {
      trendIcon = <TrendingUp className="h-4 w-4" />
      trendColor = "text-green-500"
    } else {
      trendIcon = <TrendingDown className="h-4 w-4" />
      trendColor = "text-red-500"
    }
  }

  // Status color mapping
  const getStatusColor = (status: string | null) => {
    if (!status) return "#cbd5e1"
    const style = getStatusStyle(status)
    return style.color
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>13-Week Trend</CardTitle>
          <Select value={selectedMetricId || undefined} onValueChange={setSelectedMetricId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {trends.metrics.map((m) => (
                <SelectItem key={m.metric.id} value={m.metric.id}>
                  {m.metric.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Metric summary */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Current Value</div>
              <div className="text-2xl font-bold">
                {lastValue !== undefined ? `${lastValue}${selectedMetric.metric.unit}` : "—"}
              </div>
            </div>
            {targetValue !== undefined && (
              <div className="space-y-1 text-right">
                <div className="text-sm text-muted-foreground">Target</div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {targetValue}
                  {selectedMetric.metric.unit}
                </div>
              </div>
            )}
            <div className={cn("flex items-center gap-2", trendColor)}>
              {trendIcon}
              <span className="text-sm font-medium">
                {firstValue !== undefined && lastValue !== undefined
                  ? `${lastValue > firstValue ? "+" : ""}${(lastValue - firstValue).toFixed(1)}${selectedMetric.metric.unit}`
                  : "—"}
              </span>
            </div>
          </div>

          {/* Chart */}
          <div className="w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto"
              style={{ maxHeight: "300px" }}
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
                const y = chartPadding.top + chartHeight * (1 - percent)
                const value = yMin + (yMax - yMin) * percent
                return (
                  <g key={percent}>
                    <line
                      x1={chartPadding.left}
                      y1={y}
                      x2={width - chartPadding.right}
                      y2={y}
                      stroke="#e2e8f0"
                      strokeWidth="1"
                    />
                    <text
                      x={chartPadding.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#94a3b8"
                    >
                      {value.toFixed(0)}
                    </text>
                  </g>
                )
              })}

              {/* Target line */}
              {targetValue !== undefined && (
                <line
                  x1={chartPadding.left}
                  y1={scaleY(targetValue)}
                  x2={width - chartPadding.right}
                  y2={scaleY(targetValue)}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />
              )}

              {/* Data line */}
              {points && (
                <polyline
                  points={points}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
              )}

              {/* Data points */}
              {chartData.map((d, i) => {
                if (d.value === null) return null
                return (
                  <circle
                    key={i}
                    cx={scaleX(i)}
                    cy={scaleY(d.value)}
                    r="4"
                    fill={getStatusColor(d.status)}
                    stroke="white"
                    strokeWidth="2"
                  />
                )
              })}

              {/* X-axis labels (every other week) */}
              {trends.weeks.map((week, i) => {
                if (i % 2 !== 0 && i !== trends.weeks.length - 1) return null
                return (
                  <text
                    key={i}
                    x={scaleX(i)}
                    y={height - chartPadding.bottom + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#94a3b8"
                  >
                    {formatWeek(week)}
                  </text>
                )
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyle("on-track").color }} />
              <span>On Track</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyle("at-risk").color }} />
              <span>At Risk</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusStyle("blocked").color }} />
              <span>Off Track</span>
            </div>
            {targetValue !== undefined && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 border-t-2 border-dashed border-slate-400" />
                <span>Target</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
