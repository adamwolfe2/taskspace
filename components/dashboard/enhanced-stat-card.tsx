"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedStatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  iconBg?: string
  iconColor?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  badge?: {
    label: string
    color: string
  }
}

export function EnhancedStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg = "bg-slate-100",
  iconColor = "text-slate-600",
  trend,
  badge,
}: EnhancedStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-lg", iconBg)}>
          <Icon className={cn("h-6 w-6", iconColor)} />
        </div>
        {badge && (
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", badge.color)}>
            {badge.label}
          </span>
        )}
        {trend && !badge && (
          <span
            className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              trend.isPositive
                ? "text-emerald-700 bg-emerald-50"
                : "text-red-700 bg-red-50"
            )}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}%
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-3xl font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
