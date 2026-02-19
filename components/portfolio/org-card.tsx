"use client"

import { Badge } from "@/components/ui/badge"
import { Users, FileText, CheckSquare, AlertTriangle, Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface RockHealth {
  onTrack: number
  atRisk: number
  blocked: number
  completed: number
}

interface OrgCardProps {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  role: string
  memberCount: number
  eodsToday: number
  activeTasks: number
  openEscalations: number
  plan: string
  eodRate7Day?: number
  eodRateTrend?: "up" | "down" | "stable"
  completedTasksThisWeek?: number
  riskLevel?: "healthy" | "warning" | "critical"
  avgRockProgress?: number
  rockHealth?: RockHealth
  onClick: () => void
}

const riskConfig = {
  healthy: { label: "Healthy", border: "border-l-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  warning: { label: "Warning", border: "border-l-amber-500", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  critical: { label: "Critical", border: "border-l-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
}

function RockHealthBar({ health }: { health: RockHealth }) {
  const total = health.onTrack + health.atRisk + health.blocked + health.completed
  if (total === 0) return null

  const pct = (v: number) => Math.round((v / total) * 100)
  const onTrackPct = pct(health.onTrack + health.completed)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Target className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
            {health.completed > 0 && (
              <div className="bg-slate-400" style={{ width: `${pct(health.completed)}%` }} />
            )}
            {health.onTrack > 0 && (
              <div className="bg-emerald-500" style={{ width: `${pct(health.onTrack)}%` }} />
            )}
            {health.atRisk > 0 && (
              <div className="bg-amber-500" style={{ width: `${pct(health.atRisk)}%` }} />
            )}
            {health.blocked > 0 && (
              <div className="bg-red-500" style={{ width: `${pct(health.blocked)}%` }} />
            )}
          </div>
        </div>
        <span className="text-[10px] text-slate-500 tabular-nums">{onTrackPct}%</span>
      </div>
    </div>
  )
}

export function OrgCard({
  name,
  logoUrl,
  role,
  memberCount,
  eodsToday,
  openEscalations,
  plan,
  eodRate7Day,
  completedTasksThisWeek,
  riskLevel,
  activeTasks,
  rockHealth,
  onClick,
}: OrgCardProps) {
  const risk = riskLevel ? riskConfig[riskLevel] : null

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-slate-200 border-l-4 p-4 cursor-pointer",
        "hover:border-slate-300 hover:shadow-sm transition-all duration-200",
        risk?.border || "border-l-slate-200"
      )}
      onClick={onClick}
    >
      {/* Header: logo + name + risk badge */}
      <div className="flex items-center gap-3 mb-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-9 w-9 rounded-lg object-contain bg-slate-50 p-0.5"
          />
        ) : (
          <div className="h-9 w-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {(name || "?")[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 truncate">{name}</h3>
            {risk && (
              <Badge variant="outline" className={cn("text-[10px] border flex-shrink-0", risk.badge)}>
                {risk.label}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
              {role}
            </Badge>
            <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0">
              {plan}
            </Badge>
          </div>
        </div>
      </div>

      {/* EOD rate pill */}
      {eodRate7Day !== undefined && (
        <div className="mb-3">
          <div className={cn(
            "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium border",
            (eodRate7Day ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
            (eodRate7Day ?? 0) >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-red-50 text-red-700 border-red-200"
          )}>
            {eodRate7Day}% EOD rate (7d)
          </div>
        </div>
      )}

      {/* Rock health bar */}
      {rockHealth && <div className="mb-3"><RockHealthBar health={rockHealth} /></div>}

      {/* Compact stat row */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {memberCount}
        </span>
        <span className="text-slate-300">|</span>
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {eodsToday} EODs
        </span>
        <span className="text-slate-300">|</span>
        <span className="flex items-center gap-1">
          <CheckSquare className="h-3 w-3" />
          {completedTasksThisWeek !== undefined ? `${completedTasksThisWeek} done` : `${activeTasks} active`}
        </span>
        <span className="text-slate-300">|</span>
        <span className={cn("flex items-center gap-1", openEscalations > 0 && "text-red-600")}>
          <AlertTriangle className={cn("h-3 w-3", openEscalations > 0 ? "text-red-500" : "")} />
          {openEscalations} esc
        </span>
      </div>
    </div>
  )
}
