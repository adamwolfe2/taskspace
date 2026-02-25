"use client"

import { CheckCircle2, Target, TrendingUp } from "lucide-react"
import { EnhancedStatCard } from "./enhanced-stat-card"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface StatsCardsProps {
  stats: {
    completedTasks: number
    totalTasks: number
    taskCompletionRate: number
    activeRocks: number
    averageRockProgress: number
    eodStreak: number
    rocksAtRisk?: number
    rocksBlocked?: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const themedColors = useThemedIconColors()

  // Calculate safe values
  const safeCompletionRate = isFinite(stats.taskCompletionRate) ? stats.taskCompletionRate : 0
  const safeAverageProgress = isFinite(stats.averageRockProgress) ? stats.averageRockProgress : 0

  const cards = [
    {
      title: "Task Completion",
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      trend: stats.totalTasks > 0 ? {
        value: Math.round(safeCompletionRate - 50), // Compare to 50% baseline
        isPositive: safeCompletionRate >= 50
      } : undefined,
      subtitle: `${Math.round(safeCompletionRate)}% completion rate`,
      icon: CheckCircle2,
      iconBg: "",
      iconBgStyle: { backgroundColor: themedColors.primaryAlpha10 },
      iconColor: "",
      iconColorStyle: { color: themedColors.primary },
    },
    {
      title: "Active Rocks",
      value: stats.activeRocks.toString(),
      trend: stats.activeRocks > 0 ? {
        value: 5,
        isPositive: true
      } : undefined,
      subtitle: (() => {
        const atRisk = stats.rocksAtRisk ?? 0
        const blocked = stats.rocksBlocked ?? 0
        if (atRisk === 0 && blocked === 0) return "quarterly goals"
        const parts: string[] = []
        if (atRisk > 0) parts.push(`${atRisk} at risk`)
        if (blocked > 0) parts.push(`${blocked} blocked`)
        return parts.join(", ")
      })(),
      icon: Target,
      iconBg: "",
      iconBgStyle: { backgroundColor: (stats.rocksBlocked ?? 0) > 0 ? "rgba(239,68,68,0.1)" : (stats.rocksAtRisk ?? 0) > 0 ? "rgba(245,158,11,0.1)" : themedColors.secondaryAlpha10 },
      iconColor: "",
      iconColorStyle: { color: (stats.rocksBlocked ?? 0) > 0 ? "#ef4444" : (stats.rocksAtRisk ?? 0) > 0 ? "#f59e0b" : themedColors.secondary },
    },
    {
      title: "Rock Progress",
      value: `${safeAverageProgress}%`,
      trend: safeAverageProgress > 0 ? {
        value: Math.round(safeAverageProgress > 50 ? 12 : 4),
        isPositive: safeAverageProgress > 50
      } : undefined,
      subtitle: "average completion",
      icon: TrendingUp,
      iconBg: "",
      iconBgStyle: { backgroundColor: themedColors.accentAlpha10 },
      iconColor: "",
      iconColorStyle: { color: themedColors.accent },
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
      {cards.map((card, index) => (
        <EnhancedStatCard
          key={index}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          iconBg={card.iconBg}
          iconColor={card.iconColor}
          iconBgStyle={card.iconBgStyle}
          iconColorStyle={card.iconColorStyle}
          trend={card.trend}
        />
      ))}
    </div>
  )
}
