"use client"

import { useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { DirectReport } from "@/lib/types"
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Target,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  ChevronRight,
} from "lucide-react"
import { formatDistanceToNow, parseISO } from "date-fns"

interface DirectReportCardProps {
  report: DirectReport
  onClick?: () => void
  className?: string
}

export function DirectReportCard({ report, onClick, className }: DirectReportCardProps) {
  const initials = useMemo(() => {
    const names = report.name.split(" ")
    return names.length >= 2
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : report.name.slice(0, 2).toUpperCase()
  }, [report.name])

  // Determine overall health status
  const healthStatus = useMemo(() => {
    const { metrics, eodStatus, rocks } = report

    if (metrics.overdueTasks > 2 || rocks.some((r) => r.status === "blocked")) {
      return { status: "critical", color: "text-red-600", bg: "bg-red-50" }
    }
    if (metrics.overdueTasks > 0 || rocks.some((r) => r.status === "at-risk") || eodStatus.needsEscalation) {
      return { status: "warning", color: "text-amber-600", bg: "bg-amber-50" }
    }
    if (metrics.taskCompletionRate > 70 && eodStatus.submittedToday) {
      return { status: "healthy", color: "text-emerald-600", bg: "bg-emerald-50" }
    }
    return { status: "neutral", color: "text-slate-600", bg: "bg-slate-50" }
  }, [report])

  // Calculate task trend
  const taskTrend = useMemo(() => {
    const { tasksCompletedThisWeek, tasksCompletedLastWeek } = report.metrics
    if (tasksCompletedThisWeek > tasksCompletedLastWeek) return "up"
    if (tasksCompletedThisWeek < tasksCompletedLastWeek) return "down"
    return "stable"
  }, [report.metrics])

  return (
    <Card
      className={cn(
        "cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        healthStatus.status === "critical" && "ring-2 ring-red-200",
        healthStatus.status === "warning" && "ring-1 ring-amber-200",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-14 w-14">
              {report.avatar ? (
                <AvatarImage src={report.avatar} alt={report.name} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* EOD Status Indicator */}
            <div
              className={cn(
                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center",
                report.eodStatus.submittedToday
                  ? "bg-emerald-500"
                  : "bg-slate-300"
              )}
            >
              {report.eodStatus.submittedToday ? (
                <CheckCircle2 className="h-3 w-3 text-white" />
              ) : (
                <Clock className="h-3 w-3 text-white" />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 truncate">{report.name}</h3>
              {report.eodStatus.needsEscalation && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Needs escalation</p>
                      {report.eodStatus.escalationNote && (
                        <p className="text-xs mt-1 opacity-75">{report.eodStatus.escalationNote}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-sm text-slate-500 truncate">
              {report.jobTitle || report.department}
            </p>
            {report.eodStatus.streakDays > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs text-orange-600 font-medium">
                  {report.eodStatus.streakDays} day streak
                </span>
              </div>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {/* Tasks */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg font-bold text-slate-900">
                      {report.metrics.completedTasks}
                    </span>
                    <span className="text-slate-400">/</span>
                    <span className="text-sm text-slate-500">{report.metrics.totalTasks}</span>
                    {taskTrend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                    {taskTrend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                    {taskTrend === "stable" && <Minus className="h-3 w-3 text-slate-400" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Tasks</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{report.metrics.completedTasks} completed of {report.metrics.totalTasks} total</p>
                <p className="text-xs opacity-75">
                  {report.metrics.tasksCompletedThisWeek} this week
                  {report.metrics.overdueTasks > 0 && (
                    <span className="text-red-400"> • {report.metrics.overdueTasks} overdue</span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Rocks */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="text-lg font-bold text-slate-900">{report.rocks.length}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Rocks</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{report.metrics.onTrackRocks} on track</p>
                {report.metrics.atRiskRocks > 0 && (
                  <p className="text-amber-400">{report.metrics.atRiskRocks} at risk</p>
                )}
                {report.metrics.blockedRocks > 0 && (
                  <p className="text-red-400">{report.metrics.blockedRocks} blocked</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* EOD Rate */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg font-bold text-slate-900">
                      {report.metrics.eodSubmissionRateLast30Days}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">EOD Rate</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>EOD submission rate (30 days)</p>
                <p className="text-xs opacity-75">
                  {report.eodStatus.submittedToday ? "Submitted today" : "Not submitted today"}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Rock Progress (if any active rocks) */}
        {report.rocks.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Avg. Rock Progress</span>
              <span className="font-medium text-slate-700">{report.metrics.avgRockProgress}%</span>
            </div>
            <Progress value={report.metrics.avgRockProgress} className="h-1.5" />
          </div>
        )}

        {/* Alerts Row */}
        {(report.metrics.overdueTasks > 0 ||
          report.rocks.some((r) => r.status === "blocked" || r.status === "at-risk")) && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {report.metrics.overdueTasks > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {report.metrics.overdueTasks} overdue
              </Badge>
            )}
            {report.rocks.filter((r) => r.status === "blocked").length > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                {report.rocks.filter((r) => r.status === "blocked").length} blocked
              </Badge>
            )}
            {report.rocks.filter((r) => r.status === "at-risk").length > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                {report.rocks.filter((r) => r.status === "at-risk").length} at risk
              </Badge>
            )}
          </div>
        )}

        {/* Last Activity */}
        {report.recentActivity.lastActive && (
          <p className="text-xs text-slate-400 mt-3 text-right">
            Active{" "}
            {formatDistanceToNow(parseISO(report.recentActivity.lastActive), {
              addSuffix: true,
            })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// Compact version for smaller spaces
export function DirectReportCardCompact({
  report,
  onClick,
  className,
}: DirectReportCardProps) {
  const initials = useMemo(() => {
    const names = report.name.split(" ")
    return names.length >= 2
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : report.name.slice(0, 2).toUpperCase()
  }, [report.name])

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 cursor-pointer transition-all duration-200 group",
        className
      )}
      onClick={onClick}
    >
      <Avatar className="h-10 w-10">
        {report.avatar ? (
          <AvatarImage src={report.avatar} alt={report.name} />
        ) : null}
        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900 truncate text-sm">{report.name}</p>
          {report.eodStatus.needsEscalation && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{report.metrics.completedTasks}/{report.metrics.totalTasks} tasks</span>
          {report.eodStatus.submittedToday && (
            <span className="text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" /> EOD
            </span>
          )}
        </div>
      </div>

      {report.metrics.overdueTasks > 0 && (
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs shrink-0">
          {report.metrics.overdueTasks}
        </Badge>
      )}

      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 shrink-0" />
    </div>
  )
}
