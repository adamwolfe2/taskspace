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
import { AlertCircle, TrendingUp, TrendingDown, Users, Plus, ChevronDown, ChevronUp, Award, Flame, Copy, Check, FileText, Bell, UserCheck } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AssignTaskModal } from "@/components/tasks/assign-task-modal"
import { EODInsightsCard } from "@/components/ai/eod-insights-card"
import { DailyReportShare } from "@/components/admin/daily-report-share"
import { WeeklyReportShare } from "@/components/admin/weekly-report-share"
import { TeamMemberProfileModal } from "@/components/admin/team-member-profile-modal"
import { StandupGenerator } from "@/components/admin/standup-generator"
import { TeamActivityHeatmap } from "@/components/admin/team-activity-heatmap"
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
  const [selectedMemberProfile, setSelectedMemberProfile] = useState<TeamMember | null>(null)
  const [nudgingSending, setNudgingSending] = useState(false)
  const [reassigningTaskId, setReassigningTaskId] = useState<string | null>(null)
  const [acknowledgedEscalations, setAcknowledgedEscalations] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const stored = localStorage.getItem("acknowledged_escalations")
      return new Set(stored ? JSON.parse(stored) : [])
    } catch { return new Set() }
  })
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const { toast } = useToast()
  const { currentWorkspaceId } = useWorkspaceStore()

  const handleAcknowledgeEscalation = (reportId: string) => {
    const next = new Set(acknowledgedEscalations)
    next.add(reportId)
    setAcknowledgedEscalations(next)
    try { localStorage.setItem("acknowledged_escalations", JSON.stringify(Array.from(next))) } catch {}
    toast({ title: "Escalation acknowledged", description: "Marked as reviewed" })
  }

  const sendEodNudge = async () => {
    setNudgingSending(true)
    try {
      const url = currentWorkspaceId
        ? `/api/admin/eod-reminder?workspaceId=${currentWorkspaceId}`
        : "/api/admin/eod-reminder"
      const res = await fetch(url, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send")
      toast({
        title: data.data?.notifiedCount === 0 ? "All caught up!" : "Nudge sent",
        description: data.message,
      })
    } catch {
      toast({ title: "Failed to send nudge", description: "Please try again.", variant: "destructive" })
    } finally {
      setNudgingSending(false)
    }
  }
  const handleReassignTask = async (taskId: string, newAssigneeId: string) => {
    const member = activeMembers.find((m) => (m.userId || m.id) === newAssigneeId)
    if (!member) return
    try {
      const updated = await api.tasks.update(taskId, { assigneeId: newAssigneeId, assigneeName: member.name })
      setAssignedTasks(assignedTasks.map((t) => (t.id === taskId ? updated : t)))
      toast({ title: "Task reassigned", description: `Task reassigned to ${member.name}` })
    } catch {
      toast({ title: "Failed to reassign task", variant: "destructive" })
    }
    setReassigningTaskId(null)
  }

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

  const avgAccountabilityScore = teamStats.length > 0
    ? Math.round(teamStats.reduce((s, t) => s + t.accountability.score, 0) / teamStats.length)
    : 0
  const teamGrade = avgAccountabilityScore >= 90 ? "A" : avgAccountabilityScore >= 80 ? "B" : avgAccountabilityScore >= 70 ? "C" : avgAccountabilityScore >= 60 ? "D" : "F"

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

  // Team mood from last 7 days of EOD reports
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentMoodReports = eodReports.filter((r) => {
    if (!r.mood) return false
    return new Date(r.date) >= sevenDaysAgo && teamMemberUserIds.has(r.userId)
  })
  const moodCounts = { positive: 0, neutral: 0, negative: 0 }
  for (const r of recentMoodReports) {
    if (r.mood === "positive") moodCounts.positive++
    else if (r.mood === "neutral") moodCounts.neutral++
    else if (r.mood === "negative") moodCounts.negative++
  }
  const totalMoodReports = recentMoodReports.length
  const moodPct = (count: number) => totalMoodReports > 0 ? Math.round((count / totalMoodReports) * 100) : 0

  const pendingAssignedTasks = assignedTasks.filter((t) => t.status === "pending" && t.type === "assigned")

  const todayStart = (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()
  const taskLoadByMember = activeMembers
    .map((member) => {
      const uid = member.userId || member.id
      const memberPending = assignedTasks.filter((t) => t.assigneeId === uid && t.status === "pending")
      const memberOverdue = memberPending.filter((t) => {
        if (!t.dueDate) return false
        const due = new Date(t.dueDate)
        due.setHours(0, 0, 0, 0)
        return due < todayStart
      })
      return { member, pending: memberPending.length, overdue: memberOverdue.length }
    })
    .sort((a, b) => b.pending - a.pending)
  const maxPendingLoad = Math.max(...taskLoadByMember.map((t) => t.pending), 1)

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
            {reportingRate < 100 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full text-xs h-7"
                onClick={sendEodNudge}
                disabled={nudgingSending}
              >
                <Bell className="h-3 w-3 mr-1" />
                {nudgingSending ? "Sending..." : "Nudge Team"}
              </Button>
            )}
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

        <Card className={avgAccountabilityScore >= 80 ? "border-emerald-200" : avgAccountabilityScore >= 60 ? "border-amber-200" : "border-red-200"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Grade</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-black ${avgAccountabilityScore >= 80 ? "text-emerald-600" : avgAccountabilityScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {teamGrade}
            </div>
            <p className="text-xs text-muted-foreground">Avg score: {avgAccountabilityScore}/100</p>
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

      {/* Team Mood (Last 7 Days) */}
      {totalMoodReports > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Team Mood — Last 7 Days
            </CardTitle>
            <CardDescription>Based on {totalMoodReports} EOD report{totalMoodReports !== 1 ? "s" : ""} with mood data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {([
                { key: "positive", emoji: "😊", label: "Positive", count: moodCounts.positive, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
                { key: "neutral", emoji: "😐", label: "Neutral", count: moodCounts.neutral, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
                { key: "negative", emoji: "😔", label: "Negative", count: moodCounts.negative, bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
              ] as const).map((m) => (
                <div key={m.key} className={`flex flex-col items-center gap-1 p-3 rounded-lg border ${m.bg} ${m.border}`}>
                  <span className="text-2xl">{m.emoji}</span>
                  <span className={`text-xl font-bold ${m.text}`}>{moodPct(m.count)}%</span>
                  <span className="text-xs text-slate-500">{m.label} ({m.count})</span>
                </div>
              ))}
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

      {/* Standup Generator */}
      <StandupGenerator
        eodReports={eodReports}
        teamMembers={teamMembers}
      />

      {/* Team Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Team Activity (Last 7 Days)</CardTitle>
          <CardDescription>EOD submissions and task completions per day</CardDescription>
        </CardHeader>
        <CardContent>
          <TeamActivityHeatmap
            teamMembers={teamMembers.filter((m) => m.status === "active")}
            eodReports={eodReports}
            tasks={assignedTasks}
            days={7}
          />
        </CardContent>
      </Card>

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
                    <div key={task.id} className="flex items-start justify-between p-3 border rounded-lg text-sm gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {task.assigneeName} • {task.rockTitle || "No rock"}
                        </p>
                        {reassigningTaskId === task.id && (
                          <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Select
                              defaultOpen
                              onValueChange={(v) => handleReassignTask(task.id, v)}
                              onOpenChange={(open) => { if (!open) setReassigningTaskId(null) }}
                            >
                              <SelectTrigger className="h-7 text-xs w-48">
                                <SelectValue placeholder="Pick new assignee…" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeMembers.filter((m) => (m.userId || m.id) !== task.assigneeId).map((m) => (
                                  <SelectItem key={m.id} value={m.userId || m.id}>
                                    {m.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={task.priority === "high" ? "destructive" : "default"}>{task.priority}</Badge>
                        <span className="text-xs text-muted-foreground">{task.dueDate}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                          title="Reassign task"
                          onClick={() => setReassigningTaskId(reassigningTaskId === task.id ? null : task.id)}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Load by Member */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Task Load by Member
          </CardTitle>
          <CardDescription>Pending assigned tasks per team member — red bars indicate overdue items</CardDescription>
        </CardHeader>
        <CardContent>
          {taskLoadByMember.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No team members found</p>
          ) : (
            <div className="space-y-2.5">
              {taskLoadByMember.map(({ member, pending, overdue }) => {
                const barWidth = pending === 0 ? 2 : Math.round((pending / maxPendingLoad) * 100)
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-24 text-sm truncate flex-shrink-0 text-slate-700 font-medium">
                      {member.name.split(" ")[0]}
                    </div>
                    <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pending === 0 ? "bg-slate-200" : overdue > 0 ? "bg-red-400" : "bg-blue-400"
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <div className="w-20 text-xs text-right flex-shrink-0">
                      {pending === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <>
                          <span className="font-semibold text-slate-700">{pending}</span>
                          {overdue > 0 && (
                            <span className="text-red-600 ml-1">({overdue} late)</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
              {taskLoadByMember.every((t) => t.pending === 0) && (
                <p className="text-center text-emerald-600 text-sm font-medium py-2">All caught up — no pending tasks!</p>
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
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Escalations ({escalations.filter((r) => !acknowledgedEscalations.has(r.id)).length})
                </CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </div>
              {acknowledgedEscalations.size > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 h-7" onClick={() => setShowAcknowledged(!showAcknowledged)}>
                  {showAcknowledged ? "Hide acknowledged" : `+${acknowledgedEscalations.size} acknowledged`}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const unacked = escalations.filter((r) => !acknowledgedEscalations.has(r.id))
              const acked = escalations.filter((r) => acknowledgedEscalations.has(r.id))
              const visible = showAcknowledged ? escalations : unacked
              if (visible.length === 0 && !showAcknowledged) {
                return (
                  <div className="text-center py-8">
                    <p className="text-emerald-600 font-medium text-sm">All escalations reviewed</p>
                    {acked.length > 0 && <p className="text-xs text-slate-400 mt-1">{acked.length} acknowledged</p>}
                  </div>
                )
              }
              return (
                <div className="space-y-3">
                  {visible.map((report) => {
                    const user = teamMembers.find((m) => m.userId === report.userId)
                    const isAcked = acknowledgedEscalations.has(report.id)
                    return (
                      <div key={report.id} className={`border rounded-lg p-4 space-y-2 ${isAcked ? "opacity-50 border-slate-200" : "border-border"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {user && <UserInitials name={user.name} size="sm" />}
                            <div>
                              <p className="font-medium">{user?.name}</p>
                              <p className="text-xs text-muted-foreground">{getRelativeDate(report.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAcked ? (
                              <Badge variant="outline" className="text-slate-400 border-slate-200">Reviewed</Badge>
                            ) : (
                              <>
                                <Badge variant="destructive">Escalation</Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleAcknowledgeEscalation(report.id)}
                                >
                                  Acknowledge
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                          <p className="text-sm">{report.escalationNote}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Accountability scores ranked by overall performance · Click a member to see their profile</CardDescription>
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
                  <div key={member.id} className="border border-border rounded-lg p-4 cursor-pointer hover:border-slate-300 hover:shadow-sm transition-all" onClick={() => setSelectedMemberProfile(member)}>
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

      {selectedMemberProfile && (
        <TeamMemberProfileModal
          open={!!selectedMemberProfile}
          onOpenChange={(open) => { if (!open) setSelectedMemberProfile(null) }}
          member={selectedMemberProfile}
          rocks={rocks}
          tasks={assignedTasks}
          eodReports={eodReports}
        />
      )}
    </div>
  )
}
