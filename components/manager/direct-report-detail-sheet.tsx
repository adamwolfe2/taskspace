"use client"

import { useMemo } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { DirectReport } from "@/lib/types"
import {
  CheckCircle2,
  Clock,
  Target,
  Flame,
  AlertCircle,
  Mail,
  Calendar,
  ListTodo,
  ExternalLink,
} from "lucide-react"
import { format, parseISO, formatDistanceToNow } from "date-fns"

interface DirectReportDetailSheetProps {
  report: DirectReport | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewTasks?: (userId: string) => void
  onViewRocks?: (userId: string) => void
  onViewEOD?: (userId: string) => void
  onSendMessage?: (userId: string) => void
}

export function DirectReportDetailSheet({
  report,
  open,
  onOpenChange,
  onViewTasks,
  onViewRocks,
  onViewEOD,
  onSendMessage,
}: DirectReportDetailSheetProps) {
  if (!report) return null

  const initials = useMemo(() => {
    const name = report.name || "?"
    const names = name.split(" ").filter(n => n.length > 0)
    return names.length >= 2
      ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase()
  }, [report.name])

  // Determine health score (0-100)
  const healthScore = useMemo(() => {
    let score = 50 // Base score

    // Task completion bonus/penalty
    score += (report.metrics.taskCompletionRate - 50) * 0.3

    // Overdue tasks penalty
    score -= report.metrics.overdueTasks * 5

    // EOD consistency bonus
    score += (report.metrics.eodSubmissionRateLast30Days - 50) * 0.2

    // Blocked rocks penalty
    score -= report.metrics.blockedRocks * 10

    // At-risk rocks penalty
    score -= report.metrics.atRiskRocks * 5

    // Escalation penalty
    if (report.eodStatus.needsEscalation) score -= 10

    // EOD streak bonus
    score += Math.min(report.eodStatus.streakDays, 7) * 2

    return Math.max(0, Math.min(100, Math.round(score)))
  }, [report])

  const healthColor = useMemo(() => {
    if (healthScore >= 70) return "text-emerald-600"
    if (healthScore >= 50) return "text-amber-600"
    return "text-red-600"
  }, [healthScore])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-0">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                {report.avatar ? (
                  <AvatarImage src={report.avatar} alt={report.name} />
                ) : null}
                <AvatarFallback className="bg-slate-700 text-white text-xl font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {report.eodStatus.submittedToday && (
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <SheetTitle className="text-xl">{report.name}</SheetTitle>
              <SheetDescription className="mt-1">
                {report.jobTitle || report.department}
              </SheetDescription>
              <div className="flex items-center gap-2 mt-2">
                {report.eodStatus.streakDays > 0 && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                    <Flame className="h-3 w-3 mr-1" />
                    {report.eodStatus.streakDays} day streak
                  </Badge>
                )}
                {report.eodStatus.needsEscalation && (
                  <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Needs attention
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-6 mb-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewTasks?.(report.userId)}
          >
            <ListTodo className="h-4 w-4 mr-1.5" />
            Tasks
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewRocks?.(report.userId)}
          >
            <Target className="h-4 w-4 mr-1.5" />
            Rocks
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewEOD?.(report.userId)}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            EODs
          </Button>
        </div>

        {/* Health Score Card */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Health Score</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn("text-3xl font-bold", healthColor)}>{healthScore}</span>
                  <span className="text-slate-400">/100</span>
                </div>
              </div>
              <div className="h-16 w-16">
                <svg className="transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={healthScore >= 70 ? "#10b981" : healthScore >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${healthScore}, 100`}
                  />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Different Sections */}
        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rocks">Rocks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Task Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-blue-500" />
                  Task Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {report.metrics.completedTasks}
                    </p>
                    <p className="text-xs text-slate-500">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {report.metrics.pendingTasks}
                    </p>
                    <p className="text-xs text-slate-500">Pending</p>
                  </div>
                  <div>
                    <p className={cn(
                      "text-2xl font-bold",
                      report.metrics.overdueTasks > 0 ? "text-red-600" : "text-slate-900"
                    )}>
                      {report.metrics.overdueTasks}
                    </p>
                    <p className="text-xs text-slate-500">Overdue</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {report.metrics.tasksCompletedThisWeek}
                    </p>
                    <p className="text-xs text-slate-500">This Week</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Completion Rate</span>
                    <span className="font-medium">{report.metrics.taskCompletionRate}%</span>
                  </div>
                  <Progress value={report.metrics.taskCompletionRate} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* EOD Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  EOD Reports
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className={cn(
                      "text-lg font-bold",
                      report.eodStatus.submittedToday ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {report.eodStatus.submittedToday ? "Yes" : "No"}
                    </p>
                    <p className="text-xs text-slate-500">Today</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-orange-600">
                      {report.eodStatus.streakDays}
                    </p>
                    <p className="text-xs text-slate-500">Streak</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-lg font-bold text-slate-900">
                      {report.metrics.eodSubmissionRateLast30Days}%
                    </p>
                    <p className="text-xs text-slate-500">30-Day Rate</p>
                  </div>
                </div>
                {report.eodStatus.lastSubmittedDate && (
                  <p className="text-xs text-slate-400 mt-3 text-center">
                    Last EOD:{" "}
                    {formatDistanceToNow(parseISO(report.eodStatus.lastSubmittedDate), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Escalation Alert */}
            {report.eodStatus.needsEscalation && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">Escalation Flagged</p>
                      <p className="text-sm text-red-700 mt-1">
                        {report.eodStatus.escalationNote || "This team member has flagged an escalation in their recent EOD."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Rocks Tab */}
          <TabsContent value="rocks" className="mt-4 space-y-3">
            {report.rocks.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500">No active rocks</p>
              </div>
            ) : (
              report.rocks.map((rock) => (
                <Card key={rock.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{rock.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs capitalize",
                              rock.status === "on-track" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              rock.status === "at-risk" && "bg-amber-50 text-amber-700 border-amber-200",
                              rock.status === "blocked" && "bg-red-50 text-red-700 border-red-200",
                              rock.status === "completed" && "bg-blue-50 text-blue-700 border-blue-200"
                            )}
                          >
                            {rock.status.replace("-", " ")}
                          </Badge>
                          {rock.quarter && (
                            <span className="text-xs text-slate-400">{rock.quarter}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-2xl font-bold text-slate-900">{rock.progress}%</span>
                        <p className="text-xs text-slate-500">
                          Due {format(parseISO(rock.dueDate), "MMM d")}
                        </p>
                      </div>
                    </div>
                    <Progress value={rock.progress} className="h-1.5 mt-3" />
                  </CardContent>
                </Card>
              ))
            )}

            {/* Rock Summary */}
            {report.rocks.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div className="text-center p-2 rounded-lg bg-emerald-50">
                  <p className="text-lg font-bold text-emerald-600">{report.metrics.onTrackRocks}</p>
                  <p className="text-xs text-slate-500">On Track</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50">
                  <p className="text-lg font-bold text-amber-600">{report.metrics.atRiskRocks}</p>
                  <p className="text-xs text-slate-500">At Risk</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-red-50">
                  <p className="text-lg font-bold text-red-600">{report.metrics.blockedRocks}</p>
                  <p className="text-xs text-slate-500">Blocked</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-blue-50">
                  <p className="text-lg font-bold text-blue-600">{report.metrics.completedRocks}</p>
                  <p className="text-xs text-slate-500">Done</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-4 space-y-4">
            {/* Recent Completed Tasks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Recently Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.recentActivity.recentTasksCompleted.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No recent completions</p>
                ) : (
                  <div className="space-y-2">
                    {report.recentActivity.recentTasksCompleted.map((task) => (
                      <div key={task.id} className="flex items-start gap-3 py-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                          <p className="text-xs text-slate-400">
                            {formatDistanceToNow(parseISO(task.completedAt), { addSuffix: true })}
                            {task.rockTitle && ` • ${task.rockTitle}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.recentActivity.upcomingDeadlines.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No upcoming deadlines</p>
                ) : (
                  <div className="space-y-2">
                    {report.recentActivity.upcomingDeadlines.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 py-2">
                        {item.type === "task" ? (
                          <ListTodo className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                        ) : (
                          <Target className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                          <p className="text-xs text-slate-400">
                            Due {format(parseISO(item.dueDate), "MMM d, yyyy")}
                          </p>
                        </div>
                        {item.priority === "high" && (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs shrink-0">
                            High
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer with Contact */}
        <Separator className="my-6" />
        <div className="flex items-center justify-between text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="truncate">{report.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onSendMessage?.(report.userId)}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Contact
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
