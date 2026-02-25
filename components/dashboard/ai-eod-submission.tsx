"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Send, Loader2, X, Plus, AlertTriangle, Check, Target, Calendar, Clock } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority, TeamMember } from "@/lib/types"
import type { TeamMemberMetric } from "@/lib/metrics"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { sendEODNotification } from "@/lib/email"
import { updateStreak } from "@/lib/hooks/use-productivity"
import { getTodayInTimezone, getValidDateOptions, getCurrentQuarterDisplay } from "@/lib/utils/date-utils"
import { useApp } from "@/lib/contexts/app-context"
import { useBrandTheme } from "@/lib/contexts/brand-theme-context"
import { lighten, darken } from "@/lib/utils/color-helpers"
import { CONFIG } from "@/lib/config"

interface OrgDateInfo {
  date: string
  displayDate: string
  time: string
  timezone: string
  timezoneDisplay: string
}

interface ParsedTask {
  text: string
  rockId: string | null
  rockTitle: string | null
}

interface ParsedEODData {
  tasks: ParsedTask[]
  challenges: string
  tomorrowPriorities: ParsedTask[]
  needsEscalation: boolean
  escalationNote: string | null
  metricValue: number | null
  summary: string
  warnings: string[]
}

interface AIEODSubmissionProps {
  rocks: Rock[]
  allRocks: Rock[]
  onSubmitEOD: (report: Omit<EODReport, "id" | "createdAt" | "organizationId"> | Omit<EODReport, "id" | "createdAt" | "organizationId" | "date">) => void | Promise<void>
  userId: string
  currentUser: TeamMember
}

export function AIEODSubmission({
  rocks,
  allRocks,
  onSubmitEOD,
  userId,
  currentUser,
}: AIEODSubmissionProps) {
  const { currentOrganization } = useApp()
  const { colors } = useBrandTheme()
  // Use organization timezone for date calculations
  const orgTimezone = currentOrganization?.settings?.timezone || "America/Los_Angeles"
  const todayInOrgTz = getTodayInTimezone(orgTimezone)

  const [textDump, setTextDump] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedEODData | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Date selection state
  const [selectedDate, setSelectedDate] = useState<string>(todayInOrgTz)
  const dateOptions = getValidDateOptions(todayInOrgTz)
  const isBackdatedReport = selectedDate !== todayInOrgTz

  // Editable state for the preview
  const [editedTasks, setEditedTasks] = useState<EODTask[]>([])
  const [editedChallenges, setEditedChallenges] = useState("")
  const [editedPriorities, setEditedPriorities] = useState<EODPriority[]>([])
  const [editedEscalation, setEditedEscalation] = useState(false)
  const [editedEscalationNote, setEditedEscalationNote] = useState("")
  const [metricValueToday, setMetricValueToday] = useState("")
  const [activeMetric, setActiveMetric] = useState<TeamMemberMetric | null>(null)
  const [orgDateInfo, setOrgDateInfo] = useState<OrgDateInfo | null>(null)

  const { toast } = useToast()
  const currentQuarter = getCurrentQuarterDisplay()

  // Fetch organization's current date (in org timezone)
  useEffect(() => {
    async function fetchOrgDate() {
      try {
        const response = await fetch("/api/organizations/current-date")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setOrgDateInfo(data.data)
          }
        }
      } catch {
        // Error fetching organization date
      }
    }
    fetchOrgDate()
    // Refresh every minute to keep time current
    const interval = setInterval(fetchOrgDate, CONFIG.polling.standard)
    return () => clearInterval(interval)
  }, [])

  // Fetch user's active metric
  useEffect(() => {
    async function fetchMetric() {
      try {
        const response = await fetch("/api/metrics")
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.metric) {
            setActiveMetric(data.data.metric)
          }
        }
      } catch {
        // Error fetching active metric
      }
    }
    fetchMetric()
  }, [userId])

  const handleParse = async () => {
    if (!textDump.trim()) {
      toast({
        title: "No Content",
        description: "Please paste your daily task dump first",
        variant: "destructive",
      })
      return
    }

    setIsParsing(true)
    try {
      const response = await fetch("/api/ai/eod-parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          content: textDump,
          quarter: currentQuarter,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to parse")
      }

      const parsed = data.data.parsed as ParsedEODData
      setParsedData(parsed)

      // Initialize editable state from parsed data
      setEditedTasks(
        parsed.tasks.map((t) => ({
          id: crypto.randomUUID(),
          text: t.text,
          rockId: t.rockId,
          rockTitle: t.rockTitle,
        }))
      )
      setEditedChallenges(parsed.challenges)
      setEditedPriorities(
        parsed.tomorrowPriorities.map((p) => ({
          id: crypto.randomUUID(),
          text: p.text,
          rockId: p.rockId,
          rockTitle: p.rockTitle,
        }))
      )
      setEditedEscalation(parsed.needsEscalation)
      setEditedEscalationNote(parsed.escalationNote || "")
      if (parsed.metricValue !== null) {
        setMetricValueToday(String(parsed.metricValue))
      }

      setShowPreview(true)

      toast({
        title: "Parsed Successfully",
        description: `Found ${parsed.tasks.length} tasks organized by your rocks`,
      })
    } catch (error) {
      toast({
        title: "Parse Failed",
        description: error instanceof Error ? error.message : "Failed to parse your text dump",
        variant: "destructive",
      })
    } finally {
      setIsParsing(false)
    }
  }

  const handleSubmit = async () => {
    if (editedTasks.length === 0) {
      toast({
        title: "No Tasks",
        description: "Please add at least one task to your report",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    // Parse metric value
    const parsedMetricValue = metricValueToday.trim() !== ""
      ? parseFloat(metricValueToday)
      : null
    const validMetricValue = parsedMetricValue !== null && !isNaN(parsedMetricValue)
      ? parsedMetricValue
      : null

    // Include the selected date in the report
    const report: Omit<EODReport, "id" | "createdAt" | "organizationId"> = {
      userId,
      date: selectedDate,
      submittedAt: new Date().toISOString(),
      tasks: editedTasks.filter(t => t.text.trim() !== ""),
      challenges: editedChallenges.trim() || "No challenges today",
      tomorrowPriorities: editedPriorities.filter(p => p.text.trim() !== ""),
      needsEscalation: editedEscalation,
      escalationNote: editedEscalation ? editedEscalationNote.trim() : null,
      metricValueToday: validMetricValue,
    }

    try {
      await onSubmitEOD(report)

      // Update streak after successful EOD submission
      try {
        const streakResult = await updateStreak()
        if (streakResult.isNewRecord) {
          toast({
            title: "New Streak Record!",
            description: `Congratulations! You've achieved a ${streakResult.longestStreak}-day streak!`,
          })
        }
      } catch {
        // Streak update failed, but EOD was submitted successfully
      }

      try {
        await sendEODNotification(report as EODReport, currentUser, allRocks)
      } catch {
        // Email notification failed, but EOD was saved successfully
      }

      // Reset everything
      setTextDump("")
      setParsedData(null)
      setShowPreview(false)
      setEditedTasks([])
      setEditedChallenges("")
      setEditedPriorities([])
      setEditedEscalation(false)
      setEditedEscalationNote("")
      setMetricValueToday("")
      setSelectedDate(todayInOrgTz)

      const dateLabel = dateOptions.find(d => d.value === selectedDate)?.label || selectedDate
      toast({
        title: "EOD Report Submitted",
        description: `Your AI-generated EOD report for ${dateLabel} has been recorded. You can submit another report for the same day if needed.`,
      })
    } catch (err: unknown) {
      // Check if this is a duplicate submission (409 conflict)
      const apiErr = err as { status?: number; data?: { id: string }; message?: string }
      if (apiErr.status === 409 && apiErr.data) {
        const existingReport = apiErr.data
        toast({
          title: "Report Already Exists",
          description: "You already submitted an EOD report for today. Click to view and edit it.",
          variant: "default",
          action: (
            <ToastAction
              altText="View existing report"
              onClick={() => {
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
          description: err instanceof Error ? err.message : "Failed to submit EOD report",
          variant: "destructive",
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateTask = (id: string, field: "text" | "rockId", value: string) => {
    setEditedTasks(
      editedTasks.map((t) => {
        if (t.id === id) {
          if (field === "rockId") {
            const rock = rocks.find((r) => r.id === value)
            return { ...t, rockId: value === "none" ? null : value, rockTitle: rock ? rock.title : null }
          }
          return { ...t, [field]: value }
        }
        return t
      })
    )
  }

  const removeTask = (id: string) => {
    setEditedTasks(editedTasks.filter((t) => t.id !== id))
  }

  const addTask = () => {
    setEditedTasks([...editedTasks, { id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
  }

  const addTaskToRock = (rockId: string | null, rockTitle: string | null) => {
    setEditedTasks([...editedTasks, { id: crypto.randomUUID(), text: "", rockId, rockTitle }])
  }

  const updatePriority = (id: string, field: "text" | "rockId", value: string) => {
    setEditedPriorities(
      editedPriorities.map((p) => {
        if (p.id === id) {
          if (field === "rockId") {
            const rock = rocks.find((r) => r.id === value)
            return { ...p, rockId: value === "none" ? null : value, rockTitle: rock ? rock.title : null }
          }
          return { ...p, [field]: value }
        }
        return p
      })
    )
  }

  const removePriority = (id: string) => {
    setEditedPriorities(editedPriorities.filter((p) => p.id !== id))
  }

  const addPriority = () => {
    if (editedPriorities.length < 5) {
      setEditedPriorities([
        ...editedPriorities,
        { id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null },
      ])
    }
  }

  const resetToInput = () => {
    setShowPreview(false)
    setParsedData(null)
  }

  // Group tasks by rock for display
  const tasksByRock = editedTasks.reduce((acc, task) => {
    const key = task.rockId || "general"
    if (!acc[key]) {
      acc[key] = {
        rockTitle: task.rockTitle || "General Tasks",
        tasks: [],
      }
    }
    acc[key].tasks.push(task)
    return acc
  }, {} as Record<string, { rockTitle: string; tasks: EODTask[] }>)

  return (
    <div className="section-card">
      <div className="section-header">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" style={{ color: colors.primary }} />
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">AI EOD Report Generator</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Paste your daily task dump and let AI organize it by rocks
            </p>
          </div>
        </div>
        {showPreview && (
          <Button variant="ghost" size="sm" onClick={resetToInput} className="text-slate-500">
            <X className="h-4 w-4 mr-1" />
            Start Over
          </Button>
        )}
      </div>

      <div className="p-5 space-y-6">
        {!showPreview ? (
          /* Text Input Phase */
          <>
            {/* Date Selection */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <Calendar className="h-5 w-5" style={{ color: colors.primary }} />
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-600">Report Date</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
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
              {orgDateInfo && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{orgDateInfo.time} {orgDateInfo.timezoneDisplay}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="textDump" className="text-sm font-semibold text-slate-700">
                Paste Your Daily Tasks
              </Label>
              <Textarea
                id="textDump"
                placeholder={`Paste everything you accomplished today. Example:

- Finished wireframes for the new dashboard
- Had a strategy call with the team about Q1 priorities
- Reviewed and approved the latest design mockups
- Set up automated workflow for onboarding emails
- Blocked on: waiting for API access from the vendor

Tomorrow: finalize project proposal, sync with team on sprint goals`}
                value={textDump}
                onChange={(e) => setTextDump(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && textDump.trim()) {
                    e.preventDefault()
                    handleParse()
                  }
                }}
                rows={12}
                className="bg-white border-slate-200 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Include tasks, blockers, challenges, and tomorrow's priorities. <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">Cmd+Enter</kbd> to parse.
              </p>
            </div>

            <Button
              onClick={handleParse}
              disabled={isParsing || !textDump.trim()}
              className="w-full text-white"
              style={{ backgroundColor: colors.primary }}
              aria-busy={isParsing}
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" role="status" aria-label="Parsing" />
                  Parsing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />
                  Parse & Organize Tasks
                </>
              )}
            </Button>
          </>
        ) : (
          /* Preview & Edit Phase */
          <>
            {/* Date Selection */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <Calendar className="h-5 w-5" style={{ color: colors.primary }} />
              <div className="flex-1">
                <Label className="text-xs font-medium text-slate-600">Report Date</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
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
              {orgDateInfo && (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>{orgDateInfo.time} {orgDateInfo.timezoneDisplay}</span>
                </div>
              )}
            </div>

            {/* Summary & Warnings */}
            {parsedData && (
              <div className="space-y-3">
                {parsedData.summary && (
                  <div className="rounded-lg p-3" style={{ backgroundColor: lighten(colors.primary, 45), borderWidth: 1, borderStyle: 'solid', borderColor: lighten(colors.primary, 30) }}>
                    <p className="text-sm font-medium" style={{ color: darken(colors.primary, 20) }}>{parsedData.summary}</p>
                  </div>
                )}
                {parsedData.warnings && parsedData.warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        {parsedData.warnings.map((w, i) => (
                          <p key={i}>{w}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Organized by Rock */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">
                  Tasks ({editedTasks.length})
                </Label>
                <Button variant="outline" size="sm" onClick={addTask}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Task
                </Button>
              </div>

              {Object.entries(tasksByRock).map(([key, group]) => (
                <Card key={key} className="border-slate-200">
                  <CardHeader className="py-3 px-4 bg-slate-50">
                    <div className="flex items-center gap-2">
                      {key !== "general" && (
                        <Badge variant="outline" style={{ backgroundColor: lighten(colors.primary, 45), color: darken(colors.primary, 15), borderColor: lighten(colors.primary, 30) }}>
                          Rock
                        </Badge>
                      )}
                      <CardTitle className="text-sm font-medium">{group.rockTitle}</CardTitle>
                      <Badge variant="secondary" className="ml-auto">{group.tasks.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {group.tasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-2">
                        <Check className="h-4 w-4 mt-2.5 flex-shrink-0" style={{ color: colors.primary }} />
                        <div className="flex-1 space-y-1.5">
                          <Input
                            value={task.text}
                            onChange={(e) => updateTask(task.id, "text", e.target.value)}
                            className="bg-white border-slate-200 text-sm"
                          />
                          <Select
                            value={task.rockId || "none"}
                            onValueChange={(value) => updateTask(task.id, "rockId", value)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                              <SelectValue placeholder="Assign to rock" />
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(task.id)}
                          className="text-slate-400 hover:text-red-500 mt-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="px-3 py-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addTaskToRock(
                        key === "general" ? null : key,
                        key === "general" ? null : group.rockTitle
                      )}
                      className="h-7 text-xs text-slate-500 hover:text-slate-800 px-2"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Task
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Challenges */}
            <div className="space-y-2">
              <Label htmlFor="challenges" className="text-sm font-semibold text-slate-700">
                Challenges
              </Label>
              <Textarea
                id="challenges"
                value={editedChallenges}
                onChange={(e) => setEditedChallenges(e.target.value)}
                rows={2}
                className="bg-white border-slate-200"
              />
            </div>

            {/* Weekly Metric */}
            {activeMetric && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Target className="h-4 w-4" style={{ color: colors.primary }} />
                  {activeMetric.metricName}
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={metricValueToday}
                    onChange={(e) => setMetricValueToday(e.target.value)}
                    className="w-24 bg-white border-slate-200"
                  />
                  <span className="text-sm text-slate-500">
                    Weekly goal: <span className="font-medium">{activeMetric.weeklyGoal}</span>
                  </span>
                </div>
              </div>
            )}

            {/* Tomorrow's Priorities */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold text-slate-700">Tomorrow's Priorities</Label>
                {editedPriorities.length < 5 && (
                  <Button variant="outline" size="sm" onClick={addPriority}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              {editedPriorities.map((priority) => (
                <div key={priority.id} className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      value={priority.text}
                      onChange={(e) => updatePriority(priority.id, "text", e.target.value)}
                      placeholder="Priority for tomorrow"
                      className="bg-white border-slate-200 text-sm"
                    />
                    <Select
                      value={priority.rockId || "none"}
                      onValueChange={(value) => updatePriority(priority.id, "rockId", value)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                        <SelectValue placeholder="Related rock" />
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePriority(priority.id)}
                    className="text-slate-400 hover:text-red-500 mt-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {editedPriorities.length === 0 && (
                <p className="text-sm text-slate-500 italic">No priorities for tomorrow detected. Click "Add" to add some.</p>
              )}
            </div>

            {/* Escalation */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                <Checkbox
                  id="escalation"
                  checked={editedEscalation}
                  onCheckedChange={(checked) => setEditedEscalation(checked as boolean)}
                  className="border-amber-300"
                />
                <Label htmlFor="escalation" className="cursor-pointer font-medium text-amber-800">
                  Needs Escalation
                </Label>
              </div>
              {editedEscalation && (
                <Textarea
                  placeholder="Describe what needs escalation..."
                  value={editedEscalationNote}
                  onChange={(e) => setEditedEscalationNote(e.target.value)}
                  rows={2}
                  className="bg-white border-amber-200"
                />
              )}
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || editedTasks.length === 0}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" role="status" aria-label="Submitting" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                  Submit EOD Report
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
