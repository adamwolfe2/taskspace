"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Send, Trash2, Target, Calendar, CheckCircle2, Paperclip } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority, TeamMember, AssignedTask, FileAttachment } from "@/lib/types"
import { FileTray } from "@/components/ui/file-tray"
import type { TeamMemberMetric } from "@/lib/metrics"
import { getTodayString } from "@/lib/utils/date-utils"

// Check if a date is Thursday (day 4)
function isThursday(dateStr: string): boolean {
  const date = new Date(dateStr + "T12:00:00")
  return date.getDay() === 4
}
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { sendEODNotification } from "@/lib/email"
import { updateStreak } from "@/lib/hooks/use-productivity"

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })
}

interface EODSubmissionCardProps {
  rocks: Rock[] // Current quarter rocks only
  allRocks: Rock[]
  onSubmitEOD: (report: Omit<EODReport, "id" | "createdAt" | "organizationId"> | Omit<EODReport, "id" | "createdAt" | "organizationId" | "date">) => void | Promise<void>
  userId: string
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
  selectedDate?: string | null
  onDateReset?: () => void
}

// Get current quarter string for display
function getCurrentQuarterDisplay(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
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
    // Use local timezone for date comparison to match how reportDate is formatted
    const completedAt = new Date(t.completedAt)
    const completedDate = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}-${String(completedAt.getDate()).padStart(2, '0')}`
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
  const [metricValueToday, setMetricValueToday] = useState<string>("")
  const [activeMetric, setActiveMetric] = useState<TeamMemberMetric | null>(null)
  const [weeklyMetricTotal, setWeeklyMetricTotal] = useState<number | null>(null)
  const [weeklyMetricConfirmed, setWeeklyMetricConfirmed] = useState<string>("")
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const { toast } = useToast()

  // Check if this is a Thursday submission (weekly deliverable due)
  const isThursdaySubmission = isThursday(reportDate)

  // Fetch user's active metric and weekly total (for Thursdays)
  useEffect(() => {
    async function fetchMetricAndTotal() {
      try {
        const response = await fetch("/api/metrics")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.metric) {
            setActiveMetric(data.data.metric)
          }
          // If it's Thursday, also get the weekly total so far
          if (isThursdaySubmission && data.success && data.data.weeklyTotal !== undefined) {
            setWeeklyMetricTotal(data.data.weeklyTotal)
          }
        }
      } catch (err) {
        console.error("Failed to fetch active metric:", err)
      }
    }
    fetchMetricAndTotal()
  }, [userId, isThursdaySubmission])

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
    // Parse metric value - handle empty string, NaN, etc.
    const parsedMetricValue = metricValueToday.trim() !== ""
      ? parseInt(metricValueToday, 10)
      : null
    const validMetricValue = parsedMetricValue !== null && !isNaN(parsedMetricValue)
      ? parsedMetricValue
      : null

    const report: Omit<EODReport, "id" | "createdAt" | "organizationId"> = {
      userId,
      date: reportDate,
      submittedAt: new Date().toISOString(),
      tasks: allTasks,
      challenges: challenges.trim(),
      tomorrowPriorities: filteredPriorities,
      needsEscalation,
      escalationNote: needsEscalation ? escalationNote.trim() : null,
      metricValueToday: validMetricValue,
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    try {
      await onSubmitEOD(report)

      // Update streak after successful EOD submission
      try {
        const streakResult = await updateStreak(reportDate)
        if (streakResult.isNewRecord) {
          // Show special toast for new streak record
          toast({
            title: "New Streak Record!",
            description: `Congratulations! You've achieved a ${streakResult.longestStreak}-day streak!`,
          })
        }
      } catch (streakError) {
        console.error("Failed to update streak:", streakError)
        // Don't fail the submission if streak update fails
      }

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
      setMetricValueToday("")
      setAttachments([])
      onDateReset?.()

      toast({
        title: "EOD Report Submitted",
        description: isBackdatedReport
          ? `Your EOD report for ${formatDisplayDate(reportDate)} has been recorded`
          : "Your end of day report has been recorded",
      })
    } catch (err: any) {
      // Check if this is a duplicate submission (409 conflict)
      if (err.status === 409 && err.data) {
        const existingReport = err.data
        toast({
          title: "Report Already Exists",
          description: `You already submitted an EOD report for ${formatDisplayDate(reportDate)}. Click to view and edit it.`,
          variant: "default",
          action: (
            <ToastAction
              altText="View existing report"
              onClick={() => {
                // Navigate to history page with the report ID
                window.location.href = `/?page=history&reportId=${existingReport.id}`
              }}
            >
              View Report
            </ToastAction>
          ),
        })
      } else {
        toast({
          title: "Submission Failed",
          description: err.message || "Failed to submit EOD report",
          variant: "destructive",
        })
      }
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
                  {rocks.length > 0 ? (
                    rocks.map((rock) => (
                      <SelectItem key={rock.id} value={rock.id}>
                        {rock.title}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-slate-500">
                      No rocks for {getCurrentQuarterDisplay()}
                    </div>
                  )}
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

        {/* Attachments (Optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-slate-500" />
            Attachments
            <span className="text-xs font-normal text-slate-400">(optional)</span>
          </Label>
          <FileTray
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            maxFiles={5}
            maxSizeMB={10}
          />
        </div>

        {/* Thursday Weekly Deliverable Confirmation - prominent section for EOW reporting */}
        {isThursdaySubmission && activeMetric && (
          <div className="space-y-3 p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <Label className="text-sm font-bold text-purple-900">
                Weekly Deliverable Confirmation (Due Today)
              </Label>
            </div>
            <p className="text-sm text-purple-700">
              It's Thursday! Please confirm your weekly {activeMetric.metricName.toLowerCase()} total for the scorecard.
            </p>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-purple-200">
              <div className="flex-1">
                <Label htmlFor="weeklyConfirm" className="text-xs font-medium text-slate-600 mb-1 block">
                  Final Weekly Total for {activeMetric.metricName}
                </Label>
                <Input
                  id="weeklyConfirm"
                  type="number"
                  min="0"
                  placeholder={weeklyMetricTotal !== null ? String(weeklyMetricTotal) : "0"}
                  value={weeklyMetricConfirmed}
                  onChange={(e) => setWeeklyMetricConfirmed(e.target.value)}
                  className="w-32 bg-white border-purple-300 focus:border-purple-500 text-lg font-semibold"
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Weekly Goal</p>
                <p className="text-xl font-bold text-purple-700">{activeMetric.weeklyGoal}</p>
              </div>
            </div>
            {weeklyMetricTotal !== null && (
              <p className="text-xs text-purple-600">
                <CheckCircle2 className="h-3 w-3 inline mr-1" />
                Running total from this week's reports: <span className="font-semibold">{weeklyMetricTotal}</span>
                {weeklyMetricTotal >= activeMetric.weeklyGoal
                  ? " - You've hit your goal!"
                  : ` - ${activeMetric.weeklyGoal - weeklyMetricTotal} more to reach goal`}
              </p>
            )}
          </div>
        )}

        {/* Daily Metric Input - only shown if user has an active metric */}
        {activeMetric && (
          <div className="space-y-2">
            <Label htmlFor="metricValue" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-600" />
              {activeMetric.metricName} {isThursdaySubmission ? "(Today's contribution)" : ""}
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="metricValue"
                type="number"
                min="0"
                placeholder="0"
                value={metricValueToday}
                onChange={(e) => setMetricValueToday(e.target.value)}
                className="w-24 bg-white border-slate-200 focus:border-purple-300"
              />
              <span className="text-sm text-slate-500">
                Weekly goal: <span className="font-medium text-slate-700">{activeMetric.weeklyGoal}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              How many {activeMetric.metricName.toLowerCase()} today? This will be added to your weekly total.
            </p>
          </div>
        )}

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
                  {rocks.length > 0 ? (
                    rocks.map((rock) => (
                      <SelectItem key={rock.id} value={rock.id}>
                        {rock.title}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-xs text-slate-500">
                      No rocks for {getCurrentQuarterDisplay()}
                    </div>
                  )}
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
