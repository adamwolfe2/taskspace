"use client"

import { useState, useEffect } from "react"
import type { TeamMember, EODReport, Rock, AssignedTask, EODInsight } from "@/lib/types"
import { api } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserInitials } from "@/components/shared/user-initials"
import { getRelativeDate, getTodayString } from "@/lib/utils/date-utils"
import { calculateUserStats } from "@/lib/utils/stats-calculator"
import { AlertCircle, TrendingUp, TrendingDown, Users, Plus, ChevronDown, ChevronUp } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { AssignTaskModal } from "@/components/tasks/assign-task-modal"
import { EODInsightsCard } from "@/components/ai/eod-insights-card"
import { DailyReportShare } from "@/components/admin/daily-report-share"
import { WeeklyReportShare } from "@/components/admin/weekly-report-share"
import { useToast } from "@/hooks/use-toast"

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
  const [insights, setInsights] = useState<EODInsight[]>([])
  const { toast } = useToast()

  // Fetch AI insights
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const data = await api.ai.getInsights(7)
        setInsights(data)
      } catch (err) {
        console.error("Failed to fetch insights:", err)
      }
    }
    fetchInsights()
  }, [])

  const activeMembers = teamMembers.filter((m) => m.role === "member")

  const escalations = eodReports
    .filter((r) => r.needsEscalation)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const todayReports = eodReports.filter((r) => r.date === getTodayString())
  const reportingRate = Math.round((todayReports.length / activeMembers.length) * 100)

  const teamStats = activeMembers.map((member) => {
    const stats = calculateUserStats(member.id, rocks, assignedTasks, eodReports)
    return { member, stats }
  })

  const avgRockProgress = teamStats.reduce((sum, t) => sum + t.stats.averageRockProgress, 0) / teamStats.length

  const totalRocksAtRisk = rocks.filter((r) => r.status === "at-risk").length
  const totalRocksBlocked = rocks.filter((r) => r.status === "blocked").length

  const pendingAssignedTasks = assignedTasks.filter((t) => t.status === "pending" && t.type === "assigned")

  const handleAssignTask = async (taskData: {
    assigneeId: string
    assigneeName: string
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
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
        priority: taskData.priority,
        dueDate: taskData.dueDate,
      })
      setAssignedTasks([...assignedTasks, newTask])

      toast({
        title: "Task assigned",
        description: `Task assigned to ${taskData.assigneeName}`,
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to assign task",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Team performance overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* Daily Report Share Link */}
      {organization && (
        <DailyReportShare
          organization={organization as any}
          eodReports={eodReports}
          teamMembers={teamMembers}
        />
      )}

      {/* Weekly Report Share Link */}
      {organization && (
        <WeeklyReportShare organization={organization as any} />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  const user = teamMembers.find((m) => m.id === report.userId)
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
          <CardDescription>Individual member statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamStats
              .sort((a, b) => b.stats.averageRockProgress - a.stats.averageRockProgress)
              .map(({ member, stats }) => (
                <div key={member.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <UserInitials name={member.name} />
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {stats.averageRockProgress >= 70 ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Active Rocks</p>
                      <p className="font-semibold">{stats.activeRocks}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Progress</p>
                      <p className="font-semibold">{stats.averageRockProgress}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tasks</p>
                      <p className="font-semibold">
                        {stats.completedTasks}/{stats.totalTasks}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">EOD Streak</p>
                      <p className="font-semibold">{stats.eodStreak}/7</p>
                    </div>
                  </div>
                </div>
              ))}
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
