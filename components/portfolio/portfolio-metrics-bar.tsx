"use client"

import { FileText, CheckSquare, Target, AlertTriangle } from "lucide-react"
import { MiniSparkline } from "@/components/portfolio/mini-sparkline"
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

interface PortfolioMetricsBarProps {
  orgs: PortfolioOrg[]
  trends: TrendPoint[]
}

export function PortfolioMetricsBar({ orgs, trends }: PortfolioMetricsBarProps) {
  if (orgs.length === 0) return null

  // EOD Rate (7-day avg)
  const orgsWithRate = orgs.filter((o) => o.eodRate7Day !== undefined)
  const avgEodRate = orgsWithRate.length > 0
    ? Math.round(orgsWithRate.reduce((s, o) => s + (o.eodRate7Day || 0), 0) / orgsWithRate.length)
    : 0

  // Task Velocity
  const totalCompletedThisWeek = orgs.reduce((s, o) => s + (o.completedTasksThisWeek || 0), 0)
  const lastWeekTrends = trends.slice(0, 7)
  const totalCompletedLastWeek = lastWeekTrends.reduce((s, t) => s + t.completedTaskCount, 0)
  const velocityDelta = totalCompletedLastWeek > 0
    ? Math.round(((totalCompletedThisWeek - totalCompletedLastWeek) / totalCompletedLastWeek) * 100)
    : 0

  // Rock Health
  const totalOnTrack = orgs.reduce((s, o) => s + (o.rockHealth?.onTrack || 0), 0)
  const totalCompleted = orgs.reduce((s, o) => s + (o.rockHealth?.completed || 0), 0)
  const totalAtRisk = orgs.reduce((s, o) => s + (o.rockHealth?.atRisk || 0), 0)
  const totalBlocked = orgs.reduce((s, o) => s + (o.rockHealth?.blocked || 0), 0)
  const totalRocks = totalOnTrack + totalCompleted + totalAtRisk + totalBlocked
  const rockHealthPct = totalRocks > 0
    ? Math.round(((totalOnTrack + totalCompleted) / totalRocks) * 100)
    : 0

  // Escalations
  const totalEscalations = orgs.reduce((s, o) => s + o.openEscalations, 0)
  const atRiskOrgCount = orgs.filter((o) => o.riskLevel && o.riskLevel !== "healthy").length

  // Sparkline data
  const eodSparkline = trends.map((t) => t.eodSubmissionRate)
  const taskSparkline = trends.map((t) => t.completedTaskCount)
  const escalationSparkline = trends.map((t) => t.openEscalationCount)

  const eodColor = avgEodRate >= 70 ? "#059669" : avgEodRate >= 50 ? "#d97706" : "#dc2626"

  const metrics = [
    {
      label: "EOD Rate",
      value: `${avgEodRate}%`,
      sublabel: "7-day avg across orgs",
      icon: FileText,
      iconColor: "text-blue-500",
      sparkData: eodSparkline,
      sparkColor: eodColor,
      valueColor: avgEodRate >= 70 ? "text-emerald-600" : avgEodRate >= 50 ? "text-amber-600" : "text-red-600",
    },
    {
      label: "Task Velocity",
      value: String(totalCompletedThisWeek),
      sublabel: velocityDelta !== 0
        ? `${velocityDelta > 0 ? "+" : ""}${velocityDelta}% vs last wk`
        : "Same as last wk",
      icon: CheckSquare,
      iconColor: "text-indigo-500",
      sparkData: taskSparkline,
      sparkColor: "#6366f1",
      valueColor: "text-slate-900",
    },
    {
      label: "Rock Health",
      value: `${rockHealthPct}%`,
      sublabel: `${totalOnTrack + totalCompleted}/${totalRocks} on-track/done`,
      icon: Target,
      iconColor: "text-emerald-500",
      sparkData: [] as number[],
      sparkColor: "#059669",
      valueColor: rockHealthPct >= 70 ? "text-emerald-600" : rockHealthPct >= 50 ? "text-amber-600" : "text-red-600",
      miniBar: totalRocks > 0 ? { onTrack: totalOnTrack, completed: totalCompleted, atRisk: totalAtRisk, blocked: totalBlocked, total: totalRocks } : null,
    },
    {
      label: "Escalations",
      value: String(totalEscalations),
      sublabel: atRiskOrgCount > 0 ? `${atRiskOrgCount} org${atRiskOrgCount > 1 ? "s" : ""} at risk` : "All orgs healthy",
      icon: AlertTriangle,
      iconColor: totalEscalations > 0 ? "text-red-500" : "text-slate-400",
      sparkData: escalationSparkline,
      sparkColor: totalEscalations > 0 ? "#dc2626" : "#94a3b8",
      valueColor: totalEscalations > 0 ? "text-red-600" : "text-slate-900",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m) => {
        const Icon = m.icon
        return (
          <div key={m.label} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={cn("h-3.5 w-3.5", m.iconColor)} />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{m.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <div className={cn("text-2xl font-bold", m.valueColor)}>{m.value}</div>
                <div className="text-[11px] text-slate-500 leading-tight mt-0.5">{m.sublabel}</div>
              </div>
              {m.sparkData.length > 1 && (
                <MiniSparkline data={m.sparkData} color={m.sparkColor} gradient />
              )}
              {m.miniBar && (
                <div className="w-20 space-y-1">
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
                    {m.miniBar.completed > 0 && (
                      <div className="bg-slate-400" style={{ width: `${(m.miniBar.completed / m.miniBar.total) * 100}%` }} />
                    )}
                    {m.miniBar.onTrack > 0 && (
                      <div className="bg-emerald-500" style={{ width: `${(m.miniBar.onTrack / m.miniBar.total) * 100}%` }} />
                    )}
                    {m.miniBar.atRisk > 0 && (
                      <div className="bg-amber-500" style={{ width: `${(m.miniBar.atRisk / m.miniBar.total) * 100}%` }} />
                    )}
                    {m.miniBar.blocked > 0 && (
                      <div className="bg-red-500" style={{ width: `${(m.miniBar.blocked / m.miniBar.total) * 100}%` }} />
                    )}
                  </div>
                  <div className="text-[9px] text-slate-400 text-right">{m.miniBar.total} rocks</div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
