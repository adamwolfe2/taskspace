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
  iconBgStyle?: React.CSSProperties
  iconColorStyle?: React.CSSProperties
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
  iconBgStyle,
  iconColorStyle,
  trend,
  badge,
}: EnhancedStatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className={cn("p-2 sm:p-3 rounded-lg", iconBg)} style={iconBgStyle}>
          <Icon className={cn("h-4 w-4 sm:h-6 sm:w-6", iconColor)} style={iconColorStyle} />
        </div>
        {badge && (
          <span className={cn("text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full", badge.color)}>
            {badge.label}
          </span>
        )}
        {trend && !badge && (
          <span
            className={cn(
              "text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full",
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
      <div className="space-y-0.5 sm:space-y-1">
        <p className="text-xs sm:text-sm text-muted-foreground font-medium line-clamp-2">{title}</p>
        <p className="text-xl sm:text-3xl font-bold text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
