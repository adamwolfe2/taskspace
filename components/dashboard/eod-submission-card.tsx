"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Send, Trash2 } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority, TeamMember, AssignedTask } from "@/lib/types"
import { getTodayString, formatDate } from "@/lib/utils/date-utils"
import { useToast } from "@/hooks/use-toast"
import { sendEODNotification } from "@/lib/email"

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

interface EODSubmissionCardProps {
  rocks: Rock[]
  allRocks: Rock[]
  onSubmitEOD: (report: Omit<EODReport, "id" | "createdAt" | "organizationId">) => void | Promise<void>
  userId: string
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  selectedDate?: string | null
  onDateReset?: () => void
}

export function EODSubmissionCard({
  rocks,
  allRocks,
  onSubmitEOD,
  userId,
  currentUser,
  assignedTasks,
  selectedDate,
  onDateReset,
}: EODSubmissionCardProps) {
  const reportDate = selectedDate || getTodayString()
  const isBackdatedReport = selectedDate && selectedDate !== getTodayString()

  const completedTasksForDate = assignedTasks.filter((t) => {
    if (t.assigneeId !== userId || t.status !== "completed" || !t.completedAt) {
      return false
    }
    const completedDate = new Date(t.completedAt).toISOString().split("T")[0]
    return completedDate === reportDate
  })

  const [autoTasks, setAutoTasks] = useState<EODTask[]>([])
  const [tasks, setTasks] = useState<EODTask[]>([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
  const [challenges, setChallenges] = useState("")
  const [tomorrowPriorities, setTomorrowPriorities] = useState<EODPriority[]>([
    { id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null },
  ])
  const [needsEscalation, setNeedsEscalation] = useState(false)
  const [escalationNote, setEscalationNote] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    const autoPopulated = completedTasksForDate.map((task) => ({
      id: crypto.randomUUID(),
      text: task.title,
      rockId: task.rockId,
      rockTitle: task.rockTitle,
    }))
    setAutoTasks(autoPopulated)
  }, [completedTasksForDate.length, reportDate])

  const removeAutoTask = (id: string) => {
    setAutoTasks(autoTasks.filter((t) => t.id !== id))
  }

  const addTask = () => {
    setTasks([...tasks, { id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
  }

  const removeTask = (id: string) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((t) => t.id !== id))
    }
  }

  const updateTask = (id: string, field: keyof EODTask, value: string) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === id) {
          if (field === "rockId") {
            const rock = rocks.find((r) => r.id === value)
            return { ...t, rockId: value === "none" ? null : value, rockTitle: rock ? rock.title : null }
          }
          return { ...t, [field]: value }
        }
        return t
      }),
    )
  }

  const addPriority = () => {
    if (tomorrowPriorities.length < 5) {
      setTomorrowPriorities([
        ...tomorrowPriorities,
        { id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null },
      ])
    }
  }

  const removePriority = (id: string) => {
    if (tomorrowPriorities.length > 1) {
      setTomorrowPriorities(tomorrowPriorities.filter((p) => p.id !== id))
    }
  }

  const updatePriority = (id: string, field: keyof EODPriority, value: string) => {
    setTomorrowPriorities(
      tomorrowPriorities.map((p) => {
        if (p.id === id) {
          if (field === "rockId") {
            const rock = rocks.find((r) => r.id === value)
            return { ...p, rockId: value === "none" ? null : value, rockTitle: rock ? rock.title : null }
          }
          return { ...p, [field]: value }
        }
        return p
      }),
    )
  }

  const handleSubmit = async () => {
    const allTasks = [...autoTasks, ...tasks.filter((t) => t.text.trim() !== "")]

    if (allTasks.length === 0) {
      toast({
        title: "Incomplete Form",
        description: "Please add at least one completed task",
        variant: "destructive",
      })
      return
    }

    if (!challenges.trim()) {
      toast({
        title: "Incomplete Form",
        description: "Please describe any challenges you faced",
        variant: "destructive",
      })
      return
    }

    if (needsEscalation && !escalationNote.trim()) {
      toast({
        title: "Escalation Note Required",
        description: "Please describe what needs escalation",
        variant: "destructive",
      })
      return
    }

    const filteredPriorities = tomorrowPriorities.filter((p) => p.text.trim() !== "")

    // Note: organizationId is added by the API from the session
    const report: Omit<EODReport, "id" | "createdAt" | "organizationId"> = {
      userId,
      date: reportDate,
      submittedAt: new Date().toISOString(),
      tasks: allTasks,
      challenges: challenges.trim(),
      tomorrowPriorities: filteredPriorities,
      needsEscalation,
      escalationNote: needsEscalation ? escalationNote.trim() : null,
    }

    try {
      await onSubmitEOD(report)

      try {
        await sendEODNotification(report as EODReport, currentUser, allRocks)
      } catch (error) {
        console.error("Failed to send email notification:", error)
      }

      // Reset form
      setAutoTasks([])
      setTasks([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
      setChallenges("")
      setTomorrowPriorities([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
      setNeedsEscalation(false)
      setEscalationNote("")
      onDateReset?.()

      toast({
        title: "EOD Report Submitted",
        description: isBackdatedReport
          ? `Your EOD report for ${formatDisplayDate(reportDate)} has been recorded`
          : "Your end of day report has been recorded",
      })
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit EOD report",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Submit EOD Report</h3>
            {isBackdatedReport ? (
              <p className="text-sm text-amber-600 mt-0.5 font-medium">
                Submitting for: {formatDisplayDate(reportDate)}
              </p>
            ) : (
              <p className="text-sm text-slate-500 mt-0.5">Share your daily progress and updates</p>
            )}
          </div>
          {isBackdatedReport && onDateReset && (
            <Button variant="ghost" size="sm" onClick={onDateReset} className="text-slate-500">
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>
      <div className="p-5 space-y-6">
        {/* Auto-populated tasks from completed tasks */}
        {autoTasks.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">From Completed Tasks ({autoTasks.length})</Label>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-3">
              {autoTasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{task.text}</p>
                    {task.rockTitle && (
                      <span className="inline-flex mt-1 text-xs text-slate-500 bg-white px-2 py-0.5 rounded">
                        {task.rockTitle}
                      </span>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeAutoTask(task.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manually added tasks */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700">Additional Tasks</Label>
          {tasks.map((task, index) => (
            <div key={task.id} className="space-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <div className="flex gap-2">
                <Input
                  placeholder="What did you accomplish?"
                  value={task.text}
                  onChange={(e) => updateTask(task.id, "text", e.target.value)}
                  className="flex-1 bg-white border-slate-200"
                />
                {tasks.length > 1 && (
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeTask(task.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Select value={task.rockId || "none"} onValueChange={(value) => updateTask(task.id, "rockId", value)}>
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Related Rock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General / No Rock</SelectItem>
                  {rocks.map((rock) => (
                    <SelectItem key={rock.id} value={rock.id}>
                      {rock.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addTask} className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Challenges */}
        <div className="space-y-2">
          <Label htmlFor="challenges" className="text-sm font-semibold text-slate-700">
            Challenges
          </Label>
          <Textarea
            id="challenges"
            placeholder="What challenges did you face today?"
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            rows={3}
            className="bg-white border-slate-200 focus:border-blue-300"
          />
        </div>

        {/* Tomorrow's Priorities */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-slate-700">Tomorrow's Priorities</Label>
          {tomorrowPriorities.map((priority, index) => (
            <div key={priority.id} className="space-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <div className="flex gap-2">
                <Input
                  placeholder="What's your priority?"
                  value={priority.text}
                  onChange={(e) => {
                    setTomorrowPriorities(
                      tomorrowPriorities.map((p) => (p.id === priority.id ? { ...p, text: e.target.value } : p)),
                    )
                  }}
                  className="flex-1 bg-white border-slate-200"
                />
                {tomorrowPriorities.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => {
                      if (tomorrowPriorities.length > 1) {
                        setTomorrowPriorities(tomorrowPriorities.filter((p) => p.id !== priority.id))
                      }
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Select
                value={priority.rockId || "none"}
                onValueChange={(value) => {
                  setTomorrowPriorities(
                    tomorrowPriorities.map((p) => {
                      if (p.id === priority.id) {
                        const rock = rocks.find((r) => r.id === value)
                        return {
                          ...p,
                          rockId: value === "none" ? null : value,
                          rockTitle: rock ? rock.title : null,
                        }
                      }
                      return p
                    }),
                  )
                }}
              >
                <SelectTrigger className="bg-white border-slate-200">
                  <SelectValue placeholder="Related Rock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General / No Rock</SelectItem>
                  {rocks.map((rock) => (
                    <SelectItem key={rock.id} value={rock.id}>
                      {rock.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          {tomorrowPriorities.length < 5 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (tomorrowPriorities.length < 5) {
                  setTomorrowPriorities([
                    ...tomorrowPriorities,
                    { id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null },
                  ])
                }
              }}
              className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Priority
            </Button>
          )}
        </div>

        {/* Escalation */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <Checkbox
              id="escalation"
              checked={needsEscalation}
              onCheckedChange={(checked) => setNeedsEscalation(checked as boolean)}
              className="border-amber-300"
            />
            <Label htmlFor="escalation" className="cursor-pointer font-medium text-amber-800">
              Needs Escalation
            </Label>
          </div>
          {needsEscalation && (
            <Textarea
              placeholder="Describe what needs escalation..."
              value={escalationNote}
              onChange={(e) => setEscalationNote(e.target.value)}
              rows={2}
              className="bg-white border-amber-200 focus:border-amber-300"
            />
          )}
        </div>

        <Button onClick={handleSubmit} className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-sm">
          <Send className="h-4 w-4 mr-2" />
          {isBackdatedReport ? `Submit EOD for ${formatDisplayDate(reportDate)}` : "Submit EOD Report"}
        </Button>
      </div>
    </div>
  )
}
