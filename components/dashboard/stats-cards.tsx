import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, Target, TrendingUp, Calendar } from "lucide-react"

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
  const cards = [
    {
      title: "Task Completion",
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      subtitle: `${stats.taskCompletionRate}% completion rate`,
      icon: CheckCircle2,
      color: "text-success",
    },
    {
      title: "Active Rocks",
      value: stats.activeRocks.toString(),
      subtitle: `${stats.averageRockProgress}% average progress`,
      icon: Target,
      color: "text-primary",
    },
    {
      title: "Rock Progress",
      value: `${stats.averageRockProgress}%`,
      subtitle: "Overall completion",
      icon: TrendingUp,
      color: "text-warning",
    },
    {
      title: "EOD Streak",
      value: `${stats.eodStreak}/7`,
      subtitle: "Reports this week",
      icon: Calendar,
      color: "text-chart-2",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
