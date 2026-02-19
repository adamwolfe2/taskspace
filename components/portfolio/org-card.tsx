"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, FileText, CheckSquare, AlertTriangle, TrendingUp, TrendingDown, Minus, Target } from "lucide-react"
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
  healthy: { label: "Healthy", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  warning: { label: "Warning", className: "bg-amber-50 text-amber-700 border-amber-200" },
  critical: { label: "Critical", className: "bg-red-50 text-red-700 border-red-200" },
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
}

function RockHealthBar({ health }: { health: RockHealth }) {
  const total = health.onTrack + health.atRisk + health.blocked + health.completed
  if (total === 0) return null

  const pct = (v: number) => `${Math.round((v / total) * 100)}%`

  return (
    <div className="flex items-center gap-2">
      <Target className="h-4 w-4 text-slate-400 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
          {health.completed > 0 && (
            <div className="bg-slate-400" style={{ width: pct(health.completed) }} />
          )}
          {health.onTrack > 0 && (
            <div className="bg-emerald-500" style={{ width: pct(health.onTrack) }} />
          )}
          {health.atRisk > 0 && (
            <div className="bg-amber-500" style={{ width: pct(health.atRisk) }} />
          )}
          {health.blocked > 0 && (
            <div className="bg-red-500" style={{ width: pct(health.blocked) }} />
          )}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5">
          {total} rocks
        </div>
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
  activeTasks,
  openEscalations,
  plan,
  eodRate7Day,
  eodRateTrend,
  completedTasksThisWeek,
  riskLevel,
  avgRockProgress,
  rockHealth,
  onClick,
}: OrgCardProps) {
  const risk = riskLevel ? riskConfig[riskLevel] : null
  const TrendIcon = eodRateTrend ? trendIcons[eodRateTrend] : null

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow duration-200 border border-slate-200"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={name}
                className="h-10 w-10 rounded-lg object-contain bg-slate-50 p-1"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm">
                {(name || "?")[0].toUpperCase()}
              </div>
            )}
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs capitalize">
                  {role}
                </Badge>
                <Badge variant="secondary" className="text-xs capitalize">
                  {plan}
                </Badge>
              </div>
            </div>
          </div>
          {risk && (
            <Badge variant="outline" className={cn("text-[10px] border", risk.className)}>
              {risk.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* EOD rate with trend */}
        {eodRate7Day !== undefined && (
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium border flex items-center gap-1.5",
              (eodRate7Day ?? 0) >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              (eodRate7Day ?? 0) >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-red-50 text-red-700 border-red-200"
            )}>
              {eodRate7Day}% EOD rate (7d)
              {TrendIcon && (
                <TrendIcon className={cn(
                  "h-3 w-3",
                  eodRateTrend === "up" ? "text-emerald-600" :
                  eodRateTrend === "down" ? "text-red-500" : "text-slate-400"
                )} />
              )}
            </div>
          </div>
        )}

        {/* Rock health bar */}
        {rockHealth && <div className="mb-3"><RockHealthBar health={rockHealth} /></div>}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users className="h-4 w-4 text-slate-400" />
            <span>{memberCount} members</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <FileText className="h-4 w-4 text-slate-400" />
            <span>{eodsToday} EODs today</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CheckSquare className="h-4 w-4 text-slate-400" />
            <span>
              {completedTasksThisWeek !== undefined
                ? `${completedTasksThisWeek} done this wk`
                : `${activeTasks} active tasks`
              }
            </span>
          </div>
          <div className={cn(
            "flex items-center gap-2 text-sm",
            openEscalations > 0 ? "text-red-600" : "text-slate-600"
          )}>
            <AlertTriangle className={cn(
              "h-4 w-4",
              openEscalations > 0 ? "text-red-500" : "text-slate-400"
            )} />
            <span>{openEscalations} escalations</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
