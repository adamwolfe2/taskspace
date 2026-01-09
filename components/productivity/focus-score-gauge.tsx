"use client"

import { useEffect, useState } from "react"
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getScoreColor, getScoreLabel } from "@/lib/productivity/calculations"
import type { FocusScore } from "@/lib/types"

interface FocusScoreGaugeProps {
  score: number
  breakdown?: FocusScore["breakdown"]
  trend?: "up" | "down" | "stable"
  weekOverWeek?: number
  size?: "sm" | "md" | "lg"
  showBreakdown?: boolean
  className?: string
}

const sizeConfig = {
  sm: { width: 80, stroke: 6, fontSize: "text-lg", labelSize: "text-[10px]" },
  md: { width: 120, stroke: 8, fontSize: "text-2xl", labelSize: "text-xs" },
  lg: { width: 160, stroke: 10, fontSize: "text-4xl", labelSize: "text-sm" },
}

export function FocusScoreGauge({
  score,
  breakdown,
  trend = "stable",
  weekOverWeek,
  size = "md",
  showBreakdown = true,
  className,
}: FocusScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const config = sizeConfig[size]

  const radius = (config.width - config.stroke) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (animatedScore / 100) * circumference

  useEffect(() => {
    // Animate score from 0 to target
    const duration = 1000
    const steps = 60
    const increment = score / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setAnimatedScore(score)
        clearInterval(timer)
      } else {
        setAnimatedScore(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [score])

  const scoreColor = getScoreColor(score)
  const scoreLabel = getScoreLabel(score)

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-slate-400"

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: config.width, height: config.width }}>
        {/* Background circle */}
        <svg
          className="transform -rotate-90"
          width={config.width}
          height={config.width}
        >
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={config.stroke}
          />
          {/* Animated progress circle */}
          <circle
            cx={config.width / 2}
            cy={config.width / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1s ease-out",
            }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn("font-bold", config.fontSize)}
            style={{ color: scoreColor }}
          >
            {animatedScore}
          </span>
          {size !== "sm" && (
            <span className={cn("text-slate-500", config.labelSize)}>
              {scoreLabel}
            </span>
          )}
        </div>
      </div>

      {/* Trend indicator */}
      {(trend !== "stable" || weekOverWeek !== undefined) && size !== "sm" && (
        <div className="flex items-center gap-1 mt-2">
          <TrendIcon className={cn("h-3 w-3", trendColor)} />
          {weekOverWeek !== undefined && (
            <span className={cn("text-xs font-medium", trendColor)}>
              {weekOverWeek > 0 ? "+" : ""}
              {weekOverWeek}% vs last week
            </span>
          )}
        </div>
      )}

      {/* Breakdown tooltip */}
      {showBreakdown && breakdown && size !== "sm" && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center gap-1 mt-2 text-xs text-slate-500 hover:text-slate-700 transition-colors">
                <Info className="h-3 w-3" />
                <span>View breakdown</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="w-64 p-3">
              <div className="space-y-2">
                <p className="font-semibold text-sm mb-3">Score Breakdown</p>
                <BreakdownItem
                  label="Task Completion"
                  value={breakdown.taskCompletion}
                  weight="30%"
                />
                <BreakdownItem
                  label="Rock Progress"
                  value={breakdown.rockProgress}
                  weight="25%"
                />
                <BreakdownItem
                  label="Consistency"
                  value={breakdown.consistencyStreak}
                  weight="20%"
                />
                <BreakdownItem
                  label="Report Rate"
                  value={breakdown.reportSubmission}
                  weight="15%"
                />
                <BreakdownItem
                  label="Blockers Resolved"
                  value={breakdown.blockerResolution}
                  weight="10%"
                />
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

function BreakdownItem({
  label,
  value,
  weight,
}: {
  label: string
  value: number
  weight: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-[10px] text-slate-400">({weight})</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${value}%`,
              backgroundColor: getScoreColor(value),
            }}
          />
        </div>
        <span className="text-xs font-medium w-8 text-right">{value}</span>
      </div>
    </div>
  )
}

// Compact version for dashboard cards
export function FocusScoreCompact({
  score,
  trend,
  className,
}: {
  score: number
  trend?: "up" | "down" | "stable"
  className?: string
}) {
  const scoreColor = getScoreColor(score)
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor = trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-slate-400"

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full"
        style={{ backgroundColor: `${scoreColor}20` }}
      >
        <span className="text-lg font-bold" style={{ color: scoreColor }}>
          {score}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-slate-700">Focus Score</span>
        <div className="flex items-center gap-1">
          <TrendIcon className={cn("h-3 w-3", trendColor)} />
          <span className={cn("text-xs", trendColor)}>
            {getScoreLabel(score)}
          </span>
        </div>
      </div>
    </div>
  )
}
