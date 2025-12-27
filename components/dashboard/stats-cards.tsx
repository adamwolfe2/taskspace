import { CheckCircle2, Target, TrendingUp, Calendar, TrendingDown, Minus } from "lucide-react"

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
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
        <Minus className="h-3 w-3" />
        —
      </span>
    )
  }

  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        <TrendingUp className="h-3 w-3" />
        +{value.toFixed(1)}{suffix}
      </span>
    )
  } else if (value < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        <TrendingDown className="h-3 w-3" />
        {value.toFixed(1)}{suffix}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
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
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-500",
    },
    {
      title: "Active Rocks",
      value: stats.activeRocks.toString(),
      trend: stats.activeRocks > 0 ? 5.2 : 0, // Placeholder trend
      subtitle: "quarterly goals",
      icon: Target,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
    },
    {
      title: "Rock Progress",
      value: `${safeAverageProgress}%`,
      trend: safeAverageProgress > 50 ? 12.5 : safeAverageProgress > 0 ? 4.1 : 0,
      subtitle: "average completion",
      icon: TrendingUp,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
    },
    {
      title: "EOD Streak",
      value: `${stats.eodStreak}`,
      trend: stats.eodStreak > 5 ? 25.5 : stats.eodStreak > 0 ? 10.0 : 0,
      subtitle: "reports this week",
      icon: Calendar,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-200"
        >
          <div className="flex items-start justify-between">
            <div className={`p-2 rounded-lg ${card.iconBg}`}>
              <card.icon className={`h-5 w-5 ${card.iconColor}`} />
            </div>
            <TrendBadge value={card.trend} />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
            <p className="text-sm text-slate-500 mt-1">{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
