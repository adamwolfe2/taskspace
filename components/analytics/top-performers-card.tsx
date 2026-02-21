"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy, Target, CheckCircle2, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopPerformer {
  userId: string
  name: string
  avatar: string | null
  tasksCompleted: number
  rocksCompleted: number
  eodReports: number
  score: number
}

interface TopPerformersCardProps {
  performers: TopPerformer[]
}

export function TopPerformersCard({ performers }: TopPerformersCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return "text-yellow-600 bg-yellow-50"
      case 1:
        return "text-slate-400 bg-slate-50"
      case 2:
        return "text-orange-600 bg-orange-50"
      default:
        return "text-slate-600 bg-slate-50"
    }
  }

  if (performers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-slate-50 p-2">
              <Trophy className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Team members ranked by activity score</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Trophy className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No activity data available yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-50 p-2">
            <Trophy className="h-5 w-5 text-slate-600" />
          </div>
          <div>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Team members ranked by activity score</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performers.map((performer, index) => (
            <div
              key={performer.userId}
              className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={cn("rounded-lg p-2 flex items-center justify-center w-8 h-8", getMedalColor(index))}>
                  <span className="text-sm font-bold">
                    {index < 3 ? ["🥇", "🥈", "🥉"][index] : `#${index + 1}`}
                  </span>
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={performer.avatar || undefined} alt={performer.name} />
                  <AvatarFallback className="bg-slate-700 text-white text-sm">
                    {getInitials(performer.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {performer.name}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Target className="h-3 w-3 text-slate-500" />
                      <span>{performer.rocksCompleted}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>{performer.tasksCompleted}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Calendar className="h-3 w-3 text-slate-500" />
                      <span>{performer.eodReports}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{performer.score}</p>
                <p className="text-xs text-slate-500">points</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
