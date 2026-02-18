"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, FileText, CheckSquare, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

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
  onClick: () => void
}

function getHealthColor(eodsToday: number, memberCount: number): string {
  if (memberCount === 0) return "bg-slate-100 text-slate-500"
  const rate = eodsToday / memberCount
  if (rate >= 0.8) return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (rate >= 0.5) return "bg-amber-50 text-amber-700 border-amber-200"
  return "bg-red-50 text-red-700 border-red-200"
}

function getHealthLabel(eodsToday: number, memberCount: number): string {
  if (memberCount === 0) return "No members"
  const rate = Math.round((eodsToday / memberCount) * 100)
  return `${rate}% EOD rate`
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
  onClick,
}: OrgCardProps) {
  const healthColor = getHealthColor(eodsToday, memberCount)

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
        </div>
      </CardHeader>
      <CardContent>
        {/* Health indicator */}
        <div className={cn("rounded-md px-3 py-1.5 text-xs font-medium mb-4 border", healthColor)}>
          {getHealthLabel(eodsToday, memberCount)}
        </div>

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
            <span>{activeTasks} active tasks</span>
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
