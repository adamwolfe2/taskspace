"use client"

import { useState, useEffect } from "react"
import type { TeamMember, EODReport, Rock, AssignedTask, Organization } from "@/lib/types"
import { api } from "@/lib/api/client"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserInitials } from "@/components/shared/user-initials"
import { getRelativeDate, getTodayInTimezone } from "@/lib/utils/date-utils"
import { calculateUserStats, calculateAccountabilityScore, isRockBehindSchedule } from "@/lib/utils/stats-calculator"
import { AlertCircle, TrendingUp, TrendingDown, Users, Plus, ChevronDown, ChevronUp, Award, Flame, Copy, Check, FileText } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { AssignTaskModal } from "@/components/tasks/assign-task-modal"
import { EODInsightsCard } from "@/components/ai/eod-insights-card"
import { DailyReportShare } from "@/components/admin/daily-report-share"
import { WeeklyReportShare } from "@/components/admin/weekly-report-share"
import { useToast } from "@/hooks/use-toast"
import { useAdminAiInsights } from "@/lib/hooks/use-ai-insights"

interface AdminPageProps {
  teamMembers: TeamMember[]
  eodReports: EODReport[]
  rocks: Rock[]
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  setAssignedTasks: (tasks: AssignedTask[]) => void
  organization?: { id: string; name: string; slug: string; settings: { timezone: string } }
}

export function AdminPage({
  teamMembers,
  eodReports,
  rocks,
  currentUser,
  assignedTasks,
  setAssignedTasks,
  organization,
}: AdminPageProps) {
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false)
  const [showPendingTasks, setShowPendingTasks] = useState(false)
  const [summaryCopied, setSummaryCopied] = useState(false)
  const { toast } = useToast()
  const { currentWorkspaceId } = useWorkspaceStore()
  const { data: insights, fetchInsights } = useAdminAiInsights()

  // Fetch AI insights on mount
  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  // Get all active team members (all roles count for reporting)
  const activeMembers = teamMembers.filter((m) => m.status === "active")
  // Use userId (users.id) for EOD report matching since EOD reports store users.id
  const teamMemberUserIds = new Set(teamMembers.filter(m => m.userId).map(m => m.userId))

  const escalations = eodReports
    .filter((r) => r.needsEscalation)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  // Use organization timezone for date calculations
  const orgTimezone = organization?.settings?.timezone || "America/Los_Angeles"

  // Only count reports from current team members
  const todayReports = eodReports.filter((r) => r.date === getTodayInTimezone(orgTimezone) && teamMemberUserIds.has(r.userId))
  const reportingRate = activeMembers.length > 0
    ? Math.round((todayReports.length / activeMembers.length) * 100)
    : 0

  // Calculate stats for all active team members (all roles)
  const teamStats = activeMembers.map((member) => {
    const uid = member.userId || member.id
    const stats = calculateUserStats(uid, rocks, assignedTasks, eodReports)
    const accountability = calculateAccountabilityScore(uid, rocks, assignedTasks, eodReports)
    return { member, stats, accountability }
  })

  const rocksBehinSchedule = rocks.filter((r) => isRockBehindSchedule(r)).length

  // Top performers (grade A or B)
  const topPerformers = [...teamStats]
    .sort((a, b) => b.accountability.score - a.accountability.score)
    .slice(0, 3)
    .filter((t) => t.accountability.score >= 60)

  // Urgent: on-track rocks that are actually behind schedule pace
  const urgentRocks = rocks.filter((r) => r.status === "on-track" && isRockBehindSchedule(r)).slice(0, 5)

  const avgRockProgress = teamStats.length > 0
    ? teamStats.reduce((sum, t) => sum + t.stats.averageRockProgress, 0) / teamStats.length
    : 0

  const totalRocksAtRisk = rocks.filter((r) => r.status === "at-risk").length
  const totalRocksBlocked = rocks.filter((r) => r.status === "blocked").length

  const pendingAssignedTasks = assignedTasks.filter((t) => t.status === "pending" && t.type === "assigned")

  const handleCopyTeamSummary = async () => {
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    const avgScore = teamStats.length > 0
      ? Math.round(teamStats.reduce((s, t) => s + t.accountability.score, 0) / teamStats.length)
      : 0
    const rocksOnTrackCount = rocks.filter((r) => r.status === "on-track").length
    const rocksCompleted = rocks.filter((r) => r.status === "completed").length

    const memberLines = [...teamStats]
      .sort((a, b) => b.accountability.score - a.accountability.score)
      .map(({ member, accountability, stats }) =>
        `  ${member.name} — Score: ${accountability.score} (${accountability.grade}) | Rocks: ${stats.activeRocks} active | EOD: ${accountability.breakdown.eodConsistency}% (4wk)`
      )
      .join("\n")

    const summary = [
      `📊 Team Accountability Summary — ${today}`,
      "",
      `Team avg score: ${avgScore}/100`,
      `EOD reporting today: ${todayReports.length}/${activeMembers.length} (${reportingRate}%)`,
      `Rocks: ${rocksOnTrackCount} on track, ${totalRocksAtRisk} at risk, ${totalRocksBlocked} blocked, ${rocksCompleted} completed`,
      rocksBehinSchedule > 0 ? `⚠️ Behind schedule: ${rocksBehinSchedule} rocks behind expected pace` : "",
      "",
      "Individual Scores:",
      memberLines,
    ].filter(Boolean).join("\n")

    try {
      await navigator.clipboard.writeText(summary)
      setSummaryCopied(true)
      setTimeout(() => setSummaryCopied(false), 2500)
      toast({ title: "Summary copied!", description: "Paste it into Slack, email, or your notes." })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  const handleAssignTask = async (taskData: {
    assigneeId: string
    assigneeName: string
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    projectId: string | null
    projectName: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
    sendEmail: boolean
  }) => {
    try {
      const newTask = await api.tasks.create({
        title: taskData.title,
        description: taskData.description,
        assigneeId: taskData.assigneeId,
        rockId: taskData.rockId,
        projectId: taskData.projectId,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        workspaceId: currentWorkspaceId || undefined,
      })
      setAssignedTasks([...assignedTasks, newTask])

      toast({
        title: "Task assigned",
        description: `Task assigned to ${taskData.assigneeName}`,
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to assign task",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Team performance overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyTeamSummary} className="flex-shrink-0">
          {summaryCopied ? (
            <><Check className="h-4 w-4 mr-2 text-emerald-500" />Copied!</>
          ) : (
            <><FileText className="h-4 w-4 mr-2" />Copy Summary</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Reporting</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportingRate}%</div>
            <p className="text-xs text-muted-foreground">
              {todayReports.length}/{activeMembers.length} submitted today
            </p>
            <Progress value={reportingRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Rock Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgRockProgress)}%</div>
            <p className="text-xs text-muted-foreground">Average across all rocks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rocks Needing Attention</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRocksAtRisk + totalRocksBlocked}</div>
            <p className="text-xs text-muted-foreground">
              {totalRocksAtRisk} at risk, {totalRocksBlocked} blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behind Schedule</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rocksBehinSchedule}</div>
            <p className="text-xs text-muted-foreground">
              {rocksBehinSchedule === 0 ? "All rocks on pace" : "rocks behind expected pace"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accountability Leaders */}
      {topPerformers.length > 0 && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50/60 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="h-5 w-5 text-amber-500" />
              Accountability Leaders This Quarter
            </CardTitle>
            <CardDescription>Top performing team members by accountability score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {topPerformers.map(({ member, accountability }, idx) => {
                const scoreBg =
                  accountability.score >= 80
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : "bg-amber-100 text-amber-800 border-amber-200"
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                    <div className="text-xl">{medal}</div>
                    <UserInitials name={member.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.department || "Team member"}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${scoreBg}`}>
                      <span className="font-black">{accountability.grade}</span>
                      <span>{accountability.score}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Urgent: On-track rocks that are actually behind schedule */}
      {urgentRocks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flame className="h-5 w-5 text-orange-500" />
              On-Track Rocks Behind Expected Pace ({urgentRocks.length})
            </CardTitle>
            <CardDescription>
              These rocks are marked &ldquo;On Track&rdquo; but their actual progress is below the expected quarter pace.
              Consider updating their status or having a check-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {urgentRocks.map((rock) => {
                const owner = rock.userId
                  ? teamMembers.find((m) => m.userId === rock.userId)
                  : undefined
                return (
                  <div key={rock.id} className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-orange-100">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{rock.title}</p>
                      {owner && (
                        <p className="text-xs text-slate-500">{owner.name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{rock.progress}%</span> actual
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Report Share Link */}
      {organization && (
        <DailyReportShare
          organization={organization as Organization}
          eodReports={eodReports}
          teamMembers={teamMembers}
        />
      )}

      {/* Weekly Report Share Link */}
      {organization && (
        <WeeklyReportShare organization={organization as Organization} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Task Assignment</CardTitle>
          <CardDescription>Assign priority tasks to team members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={() => setShowAssignTaskModal(true)} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Assign New Task
          </Button>

          {pendingAssignedTasks.length > 0 && (
            <div className="border-t pt-4">
              <Button
                variant="ghost"
                className="w-full justify-between"
                onClick={() => setShowPendingTasks(!showPendingTasks)}
              >
                <span>Pending Assigned Tasks ({pendingAssignedTasks.length})</span>
                {showPendingTasks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showPendingTasks && (
                <div className="mt-4 space-y-2">
                  {pendingAssignedTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {task.assigneeName} • {task.rockTitle || "No rock"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === "high" ? "destructive" : "default"}>{task.priority}</Badge>
                        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights and Escalations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <EODInsightsCard
          insights={insights}
          teamMembers={teamMembers}
          reports={eodReports}
          maxItems={5}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Escalations ({escalations.length})
            </CardTitle>
            <CardDescription>Items requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            {escalations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No escalations</p>
            ) : (
              <div className="space-y-3">
                {escalations.map((report) => {
                  const user = teamMembers.find((m) => m.userId === report.userId)
                  return (
                    <div key={report.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {user && <UserInitials name={user.name} size="sm" />}
                          <div>
                            <p className="font-medium">{user?.name}</p>
                            <p className="text-xs text-muted-foreground">{getRelativeDate(report.date)}</p>
                          </div>
                        </div>
                        <Badge variant="destructive">Escalation</Badge>
                      </div>
                      <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                        <p className="text-sm">{report.escalationNote}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Accountability scores ranked by overall performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamStats
              .sort((a, b) => b.accountability.score - a.accountability.score)
              .map(({ member, stats, accountability }) => {
                const scoreBg =
                  accountability.score >= 80
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : accountability.score >= 60
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-red-100 text-red-800 border-red-200"

                return (
                  <div key={member.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <UserInitials name={member.name} />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold ${scoreBg}`}>
                          <span className="text-base font-black">{accountability.grade}</span>
                          <span>{accountability.score}</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Active Rocks</p>
                        <p className="font-semibold">{stats.activeRocks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Avg Progress</p>
                        <p className="font-semibold">{stats.averageRockProgress}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Tasks</p>
                        <p className="font-semibold">
                          {stats.completedTasks}/{stats.totalTasks}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">EOD Streak</p>
                        <p className="font-semibold">{stats.eodStreak}d</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">EOD (4wk)</p>
                        <p className="font-semibold">{accountability.breakdown.eodConsistency}%</p>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      <AssignTaskModal
        open={showAssignTaskModal}
        onOpenChange={setShowAssignTaskModal}
        onSubmit={handleAssignTask}
        teamMembers={teamMembers}
        allRocks={rocks}
        currentUserId={currentUser.id}
      />
    </div>
  )
}
