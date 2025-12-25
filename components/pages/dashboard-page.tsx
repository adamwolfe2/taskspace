"use client"

import type { TeamMember, Rock, Task, EODReport, AssignedTask } from "@/lib/types"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { MyRocksSection } from "@/components/dashboard/my-rocks-section"
import { TasksSection } from "@/components/dashboard/tasks-section"
import { EODSubmissionCard } from "@/components/dashboard/eod-submission-card"
import { calculateUserStats } from "@/lib/utils/stats-calculator"

interface DashboardPageProps {
  currentUser: TeamMember
  rocks: Rock[]
  tasks: Task[]
  eodReports: EODReport[]
  assignedTasks: AssignedTask[]
  setRocks: (rocks: Rock[]) => void
  setTasks: (tasks: Task[]) => void
  setEODReports: (reports: EODReport[]) => void
}

export function DashboardPage({
  currentUser,
  rocks,
  tasks,
  eodReports,
  assignedTasks,
  setRocks,
  setTasks,
  setEODReports,
}: DashboardPageProps) {
  const userRocks = rocks.filter((r) => r.userId === currentUser.id)
  const userTasks = tasks.filter((t) => t.userId === currentUser.id)
  const stats = calculateUserStats(currentUser.id, rocks, tasks, eodReports)

  const handleToggleTask = (taskId: string) => {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, completed: !task.completed } : task)))
  }

  const handleUpdateProgress = (rockId: string, progress: number) => {
    setRocks(rocks.map((rock) => (rock.id === rockId ? { ...rock, progress } : rock)))
  }

  const handleSubmitEOD = (report: Omit<EODReport, "id" | "createdAt">) => {
    const newReport: EODReport = {
      ...report,
      id: `eod-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }

    setEODReports([...eodReports, newReport])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {currentUser.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground mt-1">Here's your overview for today</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyRocksSection rocks={userRocks} onUpdateProgress={handleUpdateProgress} />
        <TasksSection tasks={userTasks} onToggleTask={handleToggleTask} />
      </div>

      <EODSubmissionCard
        rocks={userRocks}
        allRocks={rocks}
        onSubmitEOD={handleSubmitEOD}
        userId={currentUser.id}
        currentUser={currentUser}
        assignedTasks={assignedTasks}
      />
    </div>
  )
}
