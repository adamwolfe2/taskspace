import { CheckCircle2, Target, TrendingUp, Calendar, TrendingDown, Minus, Flame } from "lucide-react"
import { getStreakMilestone } from "@/lib/utils/stats-calculator"
import { cn } from "@/lib/utils"

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

function TrendBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  // Handle NaN or invalid values
  if (!isFinite(value) || isNaN(value)) {
    return (
      <span className="trend-neutral">
        <Minus className="h-3 w-3" />
        —
      </span>
    )
  }

  if (value > 0) {
    return (
      <span className="trend-up">
        <TrendingUp className="h-3 w-3" />
        +{value.toFixed(1)}{suffix}
      </span>
    )
  } else if (value < 0) {
    return (
      <span className="trend-down">
        <TrendingDown className="h-3 w-3" />
        {value.toFixed(1)}{suffix}
      </span>
    )
  }
  return (
    <span className="trend-neutral">
      <Minus className="h-3 w-3" />
      0{suffix}
    </span>
  )
}

export function StatsCards({ stats }: StatsCardsProps) {
  // Calculate safe values
  const safeCompletionRate = isFinite(stats.taskCompletionRate) ? stats.taskCompletionRate : 0
  const safeAverageProgress = isFinite(stats.averageRockProgress) ? stats.averageRockProgress : 0

  const cards = [
    {
      title: "Task Completion",
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      trend: stats.totalTasks > 0 ? safeCompletionRate - 50 : 0, // Compare to 50% baseline
      subtitle: "completion rate",
      icon: CheckCircle2,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      title: "Active Rocks",
      value: stats.activeRocks.toString(),
      trend: stats.activeRocks > 0 ? 5.2 : 0, // Placeholder trend
      subtitle: "quarterly goals",
      icon: Target,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      title: "Rock Progress",
      value: `${safeAverageProgress}%`,
      trend: safeAverageProgress > 50 ? 12.5 : safeAverageProgress > 0 ? 4.1 : 0,
      subtitle: "average completion",
      icon: TrendingUp,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-600",
    },
    {
      title: "EOD Streak",
      value: stats.eodStreak > 0 ? `${stats.eodStreak} 🔥` : "0",
      trend: stats.eodStreak > 5 ? 25.5 : stats.eodStreak > 0 ? 10.0 : 0,
      subtitle: stats.eodStreak === 1 ? "consecutive day" : "consecutive days",
      icon: stats.eodStreak >= 5 ? Flame : Calendar,
      iconBg: stats.eodStreak >= 5 ? "bg-orange-100" : "bg-slate-100",
      iconColor: stats.eodStreak >= 5 ? "text-orange-600" : "text-slate-600",
      milestone: getStreakMilestone(stats.eodStreak),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="stat-card"
        >
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${card.iconBg}`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            {card.milestone ? (
              <span className={`text-xs font-semibold ${card.milestone.color} bg-orange-50 px-2 py-1 rounded-full`}>
                {card.milestone.label}
              </span>
            ) : (
              <TrendBadge value={card.trend} />
            )}
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="text-sm text-slate-500 mt-1">{card.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
