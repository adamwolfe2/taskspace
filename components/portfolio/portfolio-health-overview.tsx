"use client"

import { FileText, CheckSquare, Target, AlertTriangle, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface PortfolioOrg {
  eodRate7Day?: number
  completedTasksThisWeek?: number
  avgRockProgress?: number
  rockHealth?: { onTrack: number; atRisk: number; blocked: number; completed: number }
  openEscalations: number
  riskLevel?: "healthy" | "warning" | "critical"
}

interface TrendPoint {
  date: string
  eodSubmissionRate: number
  completedTaskCount: number
  openEscalationCount: number
}

interface PortfolioHealthOverviewProps {
  orgs: PortfolioOrg[]
  trends: TrendPoint[]
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const w = 80
  const h = 24
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(" ")

  return (
    <svg width={w} height={h} className="inline-block ml-2">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PortfolioHealthOverview({ orgs, trends }: PortfolioHealthOverviewProps) {
  if (orgs.length === 0) return null

  // Cross-org EOD rate (average of per-org 7-day rates)
  const orgsWithRate = orgs.filter((o) => o.eodRate7Day !== undefined)
  const avgEodRate = orgsWithRate.length > 0
    ? Math.round(orgsWithRate.reduce((s, o) => s + (o.eodRate7Day || 0), 0) / orgsWithRate.length)
    : 0

  // Task velocity
  const totalCompletedThisWeek = orgs.reduce((s, o) => s + (o.completedTasksThisWeek || 0), 0)
  // Approximate last week from trends (sum of completedTaskCount for first 7 days)
  const lastWeekTrends = trends.slice(0, 7)
  const totalCompletedLastWeek = lastWeekTrends.reduce((s, t) => s + t.completedTaskCount, 0)
  const velocityChange = totalCompletedLastWeek > 0
    ? Math.round(((totalCompletedThisWeek - totalCompletedLastWeek) / totalCompletedLastWeek) * 100)
    : 0

  // Rock health index
  const totalOnTrack = orgs.reduce((s, o) => s + (o.rockHealth?.onTrack || 0), 0)
  const totalCompleted = orgs.reduce((s, o) => s + (o.rockHealth?.completed || 0), 0)
  const totalRocks = orgs.reduce((s, o) => {
    const h = o.rockHealth
    return s + (h ? h.onTrack + h.atRisk + h.blocked + h.completed : 0)
  }, 0)
  const rockHealthIndex = totalRocks > 0
    ? Math.round(((totalOnTrack + totalCompleted) / totalRocks) * 100)
    : 0

  // Escalation count
  const totalEscalations = orgs.reduce((s, o) => s + o.openEscalations, 0)
  const avgEscalationFromTrends = trends.length > 0
    ? Math.round(trends.reduce((s, t) => s + t.openEscalationCount, 0) / trends.length)
    : 0

  // At-risk orgs
  const atRiskOrgs = orgs.filter((o) => o.riskLevel && o.riskLevel !== "healthy").length

  // Sparkline data
  const eodSparkline = trends.map((t) => t.eodSubmissionRate)
  const taskSparkline = trends.map((t) => t.completedTaskCount)
  const escalationSparkline = trends.map((t) => t.openEscalationCount)

  const stats = [
    {
      label: "EOD Rate",
      value: `${avgEodRate}%`,
      icon: FileText,
      sparklineData: eodSparkline,
      sparklineColor: avgEodRate >= 70 ? "#059669" : avgEodRate >= 50 ? "#d97706" : "#dc2626",
      sublabel: "7-day avg across orgs",
    },
    {
      label: "Task Velocity",
      value: String(totalCompletedThisWeek),
      icon: CheckSquare,
      sparklineData: taskSparkline,
      sparklineColor: "#6366f1",
      sublabel: velocityChange !== 0
        ? `${velocityChange > 0 ? "+" : ""}${velocityChange}% vs last wk`
        : "Same as last wk",
    },
    {
      label: "Rock Health",
      value: `${rockHealthIndex}%`,
      icon: Target,
      sparklineData: [],
      sparklineColor: "#059669",
      sublabel: `${totalOnTrack + totalCompleted}/${totalRocks} on-track/done`,
    },
    {
      label: "Escalations",
      value: String(totalEscalations),
      icon: AlertTriangle,
      sparklineData: escalationSparkline,
      sparklineColor: totalEscalations > avgEscalationFromTrends ? "#dc2626" : "#94a3b8",
      sublabel: totalEscalations > avgEscalationFromTrends
        ? "Above 14-day avg"
        : totalEscalations < avgEscalationFromTrends ? "Below 14-day avg" : "At 14-day avg",
    },
    {
      label: "At-Risk Orgs",
      value: String(atRiskOrgs),
      icon: ShieldAlert,
      sparklineData: [],
      sparklineColor: "#dc2626",
      sublabel: `of ${orgs.length} total`,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-slate-200 p-3"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-4 w-4 text-slate-400" />
              {stat.sparklineData.length > 1 && (
                <MiniSparkline data={stat.sparklineData} color={stat.sparklineColor} />
              )}
            </div>
            <div className="mt-2">
              <div className={cn(
                "text-xl font-bold",
                stat.label === "Escalations" && totalEscalations > 0 ? "text-red-600" :
                stat.label === "At-Risk Orgs" && atRiskOrgs > 0 ? "text-amber-600" :
                "text-slate-900"
              )}>
                {stat.value}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight">{stat.sublabel}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
