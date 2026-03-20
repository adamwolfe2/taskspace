"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Send, Trash2, Target, Calendar, CheckCircle2, Paperclip, Loader2, Smile, Meh, Frown } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority, AssignedTask, FileAttachment } from "@/lib/types"
import { FileTray } from "@/components/ui/file-tray"
import type { TeamMemberMetric } from "@/lib/metrics"
import { getTodayInTimezone, getValidDateOptions, getCurrentQuarterDisplay, isThursday } from "@/lib/utils/date-utils"
import { useApp } from "@/lib/contexts/app-context"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { updateStreak } from "@/lib/hooks/use-productivity"
import { api } from "@/lib/api/client"
import { isRockBehindSchedule } from "@/lib/utils/stats-calculator"
import { formatDateCompact } from "@/lib/utils/date-format"

interface EODSubmissionCardProps {
  rocks: Rock[] // Current quarter rocks only
  onSubmitEOD: (report: Omit<EODReport, "id" | "createdAt" | "organizationId"> | Omit<EODReport, "id" | "createdAt" | "organizationId" | "date">) => void | Promise<void>
  userId: string
  assignedTasks: AssignedTask[]
  selectedDate?: string | null
  onDateReset?: () => void
}

export function EODSubmissionCard({
  rocks,
  onSubmitEOD,
  userId,
  assignedTasks,
  selectedDate,
  onDateReset,
}: EODSubmissionCardProps) {
  const { currentOrganization } = useApp()
  const themedColors = useThemedIconColors()
  // Use organization timezone for date calculations
  const orgTimezone = currentOrganization?.settings?.timezone || "America/Los_Angeles"
  const todayInOrgTz = getTodayInTimezone(orgTimezone)

  // Internal date state - allows user to select date with dropdown
  const [internalSelectedDate, setInternalSelectedDate] = useState<string>(todayInOrgTz)

  // Use external selectedDate if provided (from calendar click), otherwise use internal state
  const reportDate = selectedDate || internalSelectedDate
  const isBackdatedReport = reportDate !== todayInOrgTz

  // Get valid date options
  const dateOptions = getValidDateOptions(todayInOrgTz)

  const completedTasksForDate = assignedTasks.filter((t) => {
    if (t.assigneeId !== userId || t.status !== "completed" || !t.completedAt) {
      return false
    }
    // Use org timezone for date comparison to match how reportDate is formatted
    const completedDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: orgTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(t.completedAt))
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
  const [mood, setMood] = useState<"positive" | "neutral" | "negative" | null>(null)
  const [metricValueToday, setMetricValueToday] = useState<string>("")
  const [activeMetric, setActiveMetric] = useState<TeamMemberMetric | null>(null)
  const [weeklyMetricTotal, setWeeklyMetricTotal] = useState<number | null>(null)
  const [weeklyMetricConfirmed, setWeeklyMetricConfirmed] = useState<string>("")
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const { toast } = useToast()
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Draft key scoped to user + date
  const draftKey = `eod-draft:${userId}:${reportDate}`

  // Restore draft from localStorage on mount / date change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (!saved) return
      const draft = JSON.parse(saved)
      if (draft.tasks) setTasks(draft.tasks)
      if (draft.challenges) setChallenges(draft.challenges)
      if (draft.tomorrowPriorities) setTomorrowPriorities(draft.tomorrowPriorities)
      if (draft.needsEscalation !== undefined) setNeedsEscalation(draft.needsEscalation)
      if (draft.escalationNote) setEscalationNote(draft.escalationNote)
      if (draft.metricValueToday) setMetricValueToday(draft.metricValueToday)
      setDraftRestored(true)
    } catch {
      // Corrupted draft — ignore
    }
  }, [draftKey])  

  // Auto-save draft to localStorage every 10 seconds when form has content
  const saveDraft = useCallback(() => {
    const hasContent = tasks.some(t => t.text.trim()) || challenges.trim() ||
      tomorrowPriorities.some(p => p.text.trim()) || needsEscalation || metricValueToday.trim()
    if (!hasContent) return
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        tasks, challenges, tomorrowPriorities, needsEscalation, escalationNote, metricValueToday,
        savedAt: Date.now(),
      }))
    } catch {
      // localStorage full or unavailable — ignore
    }
  }, [draftKey, tasks, challenges, tomorrowPriorities, needsEscalation, escalationNote, metricValueToday])

  useEffect(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(saveDraft, 10_000)
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current) }
  }, [saveDraft])

  // Clear draft helper (called after successful submit)
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
    setDraftRestored(false)
  }, [draftKey])

  // Check if this is a Thursday submission (weekly deliverable due)
  const isThursdaySubmission = isThursday(reportDate)

  // Fetch user's active metric and weekly total (for Thursdays)
  useEffect(() => {
    async function fetchMetricAndTotal() {
      try {
        const response = await fetch("/api/metrics")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data?.metric) {
            setActiveMetric(data.data.metric)
          }
          // If it's Thursday, also get the weekly total so far
          if (isThursdaySubmission && data.success && data.data?.weeklyTotal !== undefined) {
            setWeeklyMetricTotal(data.data.weeklyTotal)
          }
        }
      } catch {
        // Error fetching active metric
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally using .length to avoid re-running on every array reference change
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

  const _addPriority = () => {
    if (tomorrowPriorities.length < 5) {
      setTomorrowPriorities([
        ...tomorrowPriorities,
        { id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null },
      ])
    }
  }

  const _removePriority = (id: string) => {
    if (tomorrowPriorities.length > 1) {
      setTomorrowPriorities(tomorrowPriorities.filter((p) => p.id !== id))
    }
  }

  const _updatePriority = (id: string, field: keyof EODPriority, value: string) => {
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
        title: "Incomplete form",
        description: "Please add at least one completed task",
        variant: "destructive",
      })
      return
    }

    if (!challenges.trim()) {
      toast({
        title: "Incomplete form",
        description: "Please describe any challenges you faced",
        variant: "destructive",
      })
      return
    }

    if (needsEscalation && !escalationNote.trim()) {
      toast({
        title: "Escalation note required",
        description: "Please describe what needs escalation",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

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
      mood: mood || undefined,
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
            title: "New streak record",
            description: `Congratulations, you've achieved a ${streakResult.longestStreak}-day streak`,
          })
        }
      } catch {
        // Don't fail the submission if streak update fails
      }

      // Reset form + clear draft
      setAutoTasks([])
      setTasks([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
      setChallenges("")
      setTomorrowPriorities([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
      setNeedsEscalation(false)
      setEscalationNote("")
      setMood(null)
      setMetricValueToday("")
      setAttachments([])
      setInternalSelectedDate(todayInOrgTz) // Reset date to today
      onDateReset?.()
      clearDraft()

      toast({
        title: "EOD report submitted",
        description: `Your EOD report for ${formatDateCompact(reportDate)} has been recorded. You can submit another report for the same day if needed.`,
      })

      // Nudge user about behind-schedule rocks after successful submission
      const behindRocks = rocks.filter(
        (r) => r.status !== "completed" && isRockBehindSchedule(r)
      )
      if (behindRocks.length > 0) {
        setTimeout(() => {
          toast({
            title: `${behindRocks.length} rock${behindRocks.length > 1 ? "s" : ""} behind pace`,
            description:
              behindRocks.length === 1
                ? `"${behindRocks[0].title}" is behind its expected progress. Consider updating it.`
                : `${behindRocks.length} rocks need attention. Great time to update progress while it's top of mind.`,
            action: (
              <ToastAction
                altText="View Rocks"
                onClick={() => {
                  // Navigate to rocks page via hash — app uses currentPage state
                  const el = document.querySelector('[data-nav="rocks"]') as HTMLElement | null
                  el?.click()
                }}
              >
                View Rocks
              </ToastAction>
            ),
          })
        }, 1500)
      }
    } catch (err: unknown) {
      // Check if this is a duplicate submission (409 conflict)
      const apiErr = err as { status?: number; data?: { id: string }; message?: string }
      if (apiErr.status === 409 && apiErr.data) {
        const existingReport = apiErr.data

        // Automatically update the existing report instead of showing an error
        try {
          await api.eodReports.update(existingReport.id, {
            tasks: allTasks,
            challenges: challenges.trim(),
            tomorrowPriorities: filteredPriorities,
            needsEscalation,
            escalationNote: needsEscalation ? escalationNote.trim() : null,
            metricValueToday: validMetricValue,
            attachments: attachments.length > 0 ? attachments : undefined,
          })

          // Update streak after successful update
          try {
            const streakResult = await updateStreak(reportDate)
            if (streakResult.isNewRecord) {
              toast({
                title: "New streak record",
                description: `Congratulations, you've achieved a ${streakResult.longestStreak}-day streak`,
              })
            }
          } catch {
            // Streak update failed, but report was updated successfully
          }

          // Reset form + clear draft
          setAutoTasks([])
          setTasks([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
          setChallenges("")
          setTomorrowPriorities([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
          setNeedsEscalation(false)
          setEscalationNote("")
          setMetricValueToday("")
          setAttachments([])
          setInternalSelectedDate(todayInOrgTz) // Reset date to today
          onDateReset?.()
          clearDraft()

          toast({
            title: "EOD report updated",
            description: `Your EOD report for ${formatDateCompact(reportDate)} has been updated`,
          })
        } catch (updateErr: unknown) {
          toast({
            title: "Update failed",
            description: updateErr instanceof Error ? updateErr.message : "Failed to update existing EOD report. You may need to contact an admin.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Submission failed",
          description: err instanceof Error ? err.message : "Failed to submit EOD report",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Submit EOD Report</h3>
            <p className="text-sm text-slate-500 mt-0.5">Share your daily progress and updates</p>
          </div>
          {isBackdatedReport && onDateReset && (
            <Button variant="ghost" size="sm" onClick={() => {
              setInternalSelectedDate(todayInOrgTz)
              onDateReset()
            }} className="text-slate-500">
              <X className="h-4 w-4 mr-1" />
              Reset to Today
            </Button>
          )}
        </div>
      </div>
      {/* Date Selection */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <Calendar className="h-5 w-5" style={{ color: themedColors.secondary }} />
          <div className="flex-1">
            <Label className="text-xs font-medium text-slate-600">
              Report Date <span className="font-normal text-slate-400">({orgTimezone.replace(/_/g, " ")})</span>
            </Label>
            <Select
              value={reportDate}
              onValueChange={(value) => {
                setInternalSelectedDate(value)
                // Clear external selected date if parent provided onDateReset
                if (value === todayInOrgTz && onDateReset) {
                  onDateReset()
                }
              }}
            >
              <SelectTrigger className="mt-1 bg-white border-slate-200 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isBackdatedReport && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
              Past Date
            </span>
          )}
        </div>
      </div>
      <div className="p-5 space-y-6">
        {/* Draft restored notice */}
        {draftRestored && (
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm">
            <span className="text-slate-600">Draft restored from earlier session</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-red-600 h-7 px-2"
              onClick={() => {
                clearDraft()
                setTasks([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
                setChallenges("")
                setTomorrowPriorities([{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
                setNeedsEscalation(false)
                setEscalationNote("")
                setMetricValueToday("")
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Discard
            </Button>
          </div>
        )}

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
          {tasks.map((task, _index) => (
            <div key={task.id} className="space-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <div className="flex gap-2">
                <Input
                  placeholder="What did you accomplish?"
                  value={task.text}
                  onChange={(e) => updateTask(task.id, "text", e.target.value)}
                  className="flex-1 bg-white border-slate-200"
                />
                {tasks.length > 1 && (
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => removeTask(task.id)} aria-label="Remove task">
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
            maxLength={5000}
            className="bg-white border-slate-200 focus:border-blue-300"
          />
        </div>

        {/* Attachments (Optional) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Paperclip className="h-4 w-4" style={{ color: themedColors.secondary }} />
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
          <div className="space-y-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-600" />
              <Label className="text-sm font-bold text-slate-900">
                Weekly Deliverable Confirmation (Due Today)
              </Label>
            </div>
            <p className="text-sm text-slate-700">
              It's Thursday! Please confirm your weekly {activeMetric.metricName.toLowerCase()} total for the scorecard.
            </p>
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
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
                  className="w-32 bg-white border-slate-300 focus:border-primary text-lg font-semibold"
                />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Weekly Goal</p>
                <p className="text-xl font-bold text-slate-700">{activeMetric.weeklyGoal}</p>
              </div>
            </div>
            {weeklyMetricTotal !== null && (
              <p className="text-xs text-slate-600">
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
              <Target className="h-4 w-4 text-slate-600" />
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
                className="w-24 bg-white border-slate-200 focus:border-primary/50"
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
          {tomorrowPriorities.map((priority, _index) => (
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
                    aria-label="Remove priority"
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
              maxLength={2000}
              className="bg-white border-amber-200 focus:border-amber-300"
            />
          )}
        </div>

        {/* Mood */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">How are you feeling? <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
          <div className="flex gap-3">
            {([
              { value: "positive" as const, Icon: Smile, label: "Positive" },
              { value: "neutral" as const, Icon: Meh, label: "Neutral" },
              { value: "negative" as const, Icon: Frown, label: "Negative" },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMood(mood === opt.value ? null : opt.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                  mood === opt.value
                    ? "border-slate-400 bg-slate-50 text-slate-800"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                <opt.Icon className="h-5 w-5" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Sticky submit button — always visible at bottom of card */}
      <div className="sticky bottom-0 p-4 border-t border-slate-200 bg-white rounded-b-lg">
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12 text-base font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-lg">
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-5 w-5 mr-2" />
              {isBackdatedReport ? `Submit EOD for ${formatDateCompact(reportDate)}` : "Submit EOD Report"}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
