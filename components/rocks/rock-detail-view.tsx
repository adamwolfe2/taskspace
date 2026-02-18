"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  User,
  ListTodo,
  TrendingUp,
  History,
  ArrowLeft,
  CheckCircle,
  Circle,
  Loader2,
} from "lucide-react"
import { RockCheckinDialog } from "./rock-checkin-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import type {
  Rock,
  RockTask,
  RockMilestone,
  RockCheckin,
  RockConfidence,
} from "@/lib/db/rocks"

interface RockDetailViewProps {
  rockId: string
  onBack?: () => void
}

const confidenceConfig = {
  on_track: {
    icon: CheckCircle2,
    label: "On Track",
    statusKey: "on-track" as const,
  },
  at_risk: {
    icon: AlertTriangle,
    label: "At Risk",
    statusKey: "at-risk" as const,
  },
  off_track: {
    icon: XCircle,
    label: "Off Track",
    statusKey: "blocked" as const,
  },
}

const taskStatusConfig = {
  pending: { icon: Circle, label: "Pending", statusKey: "pending" as const },
  "in-progress": { icon: Clock, label: "In Progress", statusKey: "in-progress" as const },
  completed: { icon: CheckCircle, label: "Completed", statusKey: "completed" as const },
}

export function RockDetailView({ rockId, onBack }: RockDetailViewProps) {
  const { toast } = useToast()
  const { getStatusStyle } = useBrandStatusStyles()
  const [loading, setLoading] = useState(true)
  const [rock, setRock] = useState<Rock | null>(null)
  const [tasks, setTasks] = useState<RockTask[]>([])
  const [milestones, setMilestones] = useState<RockMilestone[]>([])
  const [checkins, setCheckins] = useState<RockCheckin[]>([])
  const [showCheckinDialog, setShowCheckinDialog] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const fetchRockDetails = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rocks/${rockId}`, {
        credentials: "include",
      })
      const result = await response.json()

      if (result.success) {
        setRock(result.data.rock)
        setTasks(result.data.tasks)
        setMilestones(result.data.milestones)
        setCheckins(result.data.checkins)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load rock details",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load rock details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [rockId, toast])

  useEffect(() => {
    fetchRockDetails()
  }, [fetchRockDetails])

  const handleComplete = async () => {
    if (!rock) return
    setIsCompleting(true)

    try {
      const response = await fetch(`/api/rocks/${rockId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
        body: JSON.stringify({ reopen: rock.status === "completed" }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: rock.status === "completed" ? "Rock Reopened" : "Rock Completed",
          description: result.message,
        })
        fetchRockDetails()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update rock",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getDaysRemaining = () => {
    if (!rock?.dueDate) return null
    const due = new Date(rock.dueDate)
    const now = new Date()
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!rock) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Rock not found</h3>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="mt-4">
            Go Back
          </Button>
        )}
      </div>
    )
  }

  const confidence = (rock.confidence || "on_track") as RockConfidence
  const confConfig = confidenceConfig[confidence]
  const ConfidenceIcon = confConfig.icon
  const daysRemaining = getDaysRemaining()
  const completedTasks = tasks.filter((t) => t.status === "completed").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Target className="h-6 w-6 text-primary" />
              {rock.title}
            </h1>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-600">
              {rock.userName && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {rock.userName}
                </span>
              )}
              {rock.quarter && <Badge variant="outline">{rock.quarter}</Badge>}
              {rock.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Due {formatDate(rock.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCheckinDialog(true)}>
            <TrendingUp className="h-4 w-4 mr-1" />
            Check-in
          </Button>
          <Button
            variant={rock.status === "completed" ? "outline" : "default"}
            onClick={handleComplete}
            disabled={isCompleting}
          >
            {isCompleting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            )}
            {rock.status === "completed" ? "Reopen" : "Complete"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Progress */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Progress</span>
              <span className="text-2xl font-bold">{rock.progress}%</span>
            </div>
            <Progress value={rock.progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Confidence */}
        <Card style={{ backgroundColor: getStatusStyle(confConfig.statusKey).backgroundColor }}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Confidence</span>
              <ConfidenceIcon className="h-6 w-6" style={{ color: getStatusStyle(confConfig.statusKey).color }} />
            </div>
            <div className="text-xl font-bold mt-1" style={{ color: getStatusStyle(confConfig.statusKey).color }}>
              {confConfig.label}
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Tasks</span>
              <ListTodo className="h-5 w-5 text-slate-400" />
            </div>
            <div className="text-xl font-bold mt-1">
              {completedTasks} / {tasks.length}
            </div>
            <div className="text-xs text-slate-500">completed</div>
          </CardContent>
        </Card>

        {/* Days Remaining */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Time Left</span>
              <Clock className="h-5 w-5 text-slate-400" />
            </div>
            <div
              className={cn(
                "text-xl font-bold mt-1",
                daysRemaining !== null && daysRemaining < 0
                  ? "text-red-600"
                  : daysRemaining !== null && daysRemaining < 14
                    ? "text-yellow-600"
                    : "text-slate-900"
              )}
            >
              {daysRemaining !== null
                ? daysRemaining < 0
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : `${daysRemaining} days`
                : "No due date"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {rock.description && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-slate-600">{rock.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Linked Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-primary" />
            Linked Tasks ({tasks.length})
          </CardTitle>
          <CardDescription>
            Tasks contributing to this rock's progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ListTodo className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tasks linked to this rock yet</p>
              <p className="text-sm">Link tasks to automatically track progress</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => {
                  const statusConf =
                    taskStatusConfig[task.status as keyof typeof taskStatusConfig] ||
                    taskStatusConfig.pending
                  const StatusIcon = statusConf.icon
                  const taskStyle = getStatusStyle(statusConf.statusKey)
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusIcon className="h-4 w-4" style={{ color: taskStyle.color }} />
                          <span style={{ color: taskStyle.color }}>{statusConf.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>{task.assigneeName || "-"}</TableCell>
                      <TableCell>{formatDate(task.dueDate)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Check-in History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Check-in History
          </CardTitle>
          <CardDescription>Weekly confidence updates and notes</CardDescription>
        </CardHeader>
        <CardContent>
          {checkins.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No check-ins recorded yet</p>
              <p className="text-sm">Record weekly updates during L10 meetings</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checkins.map((checkin) => {
                const conf = confidenceConfig[checkin.confidence]
                const Icon = conf.icon
                const checkinStyle = getStatusStyle(conf.statusKey)
                return (
                  <div
                    key={checkin.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <div className="p-1.5 rounded-full" style={{ backgroundColor: checkinStyle.backgroundColor }}>
                      <Icon className="h-4 w-4" style={{ color: checkinStyle.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium" style={{ color: checkinStyle.color }}>
                          {conf.label}
                        </span>
                        <span className="text-xs text-slate-500">
                          Week of {formatDate(checkin.weekStart)}
                        </span>
                      </div>
                      {checkin.notes && (
                        <p className="text-sm text-slate-600 mt-1">{checkin.notes}</p>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        {checkin.progressAtCheckin}% progress at check-in
                        {checkin.userName && ` • by ${checkin.userName}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Dialog */}
      <RockCheckinDialog
        open={showCheckinDialog}
        onOpenChange={setShowCheckinDialog}
        rockId={rock.id}
        rockTitle={rock.title}
        currentProgress={rock.progress}
        currentConfidence={confidence}
        onCheckinComplete={fetchRockDetails}
      />
    </div>
  )
}
