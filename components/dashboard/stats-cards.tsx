"use client"

import { CheckCircle2, Target, TrendingUp, Calendar, Flame } from "lucide-react"
import { getStreakMilestone } from "@/lib/utils/stats-calculator"
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
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Active Rocks",
      value: stats.activeRocks.toString(),
      trend: stats.activeRocks > 0 ? {
        value: 5,
        isPositive: true
      } : undefined,
      subtitle: "quarterly goals",
      icon: Target,
      iconBg: "",
      iconBgStyle: { backgroundColor: themedColors.primaryAlpha10 },
      iconColor: "",
      iconColorStyle: { color: themedColors.primary },
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
      iconBgStyle: { backgroundColor: themedColors.secondaryAlpha10 },
      iconColor: "",
      iconColorStyle: { color: themedColors.secondary },
    },
    {
      title: "EOD Streak",
      value: stats.eodStreak > 0 ? `${stats.eodStreak}` : "0",
      subtitle: stats.eodStreak === 1 ? "consecutive day" : "consecutive days",
      icon: stats.eodStreak >= 5 ? Flame : Calendar,
      iconBg: stats.eodStreak >= 5 ? "bg-orange-100" : "bg-slate-100",
      iconColor: stats.eodStreak >= 5 ? "text-orange-600" : "text-slate-600",
      badge: stats.eodStreak > 0 ? {
        label: getStreakMilestone(stats.eodStreak)?.label || "",
        color: (getStreakMilestone(stats.eodStreak)?.color || "text-orange-600") + " bg-orange-50",
      } : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      {cards.map((card, index) => (
        <EnhancedStatCard
          key={index}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          iconBg={card.iconBg}
          iconColor={card.iconColor}
          trend={card.trend}
          badge={card.badge}
        />
      ))}
    </div>
  )
}
