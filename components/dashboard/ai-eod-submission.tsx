"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Sparkles, Send, Loader2, X, Plus, AlertTriangle, Check, Target, Calendar, Clock } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority, TeamMember } from "@/lib/types"
import type { TeamMemberMetric } from "@/lib/metrics"
import { useToast } from "@/hooks/use-toast"
import { sendEODNotification } from "@/lib/email"

interface OrgDateInfo {
  date: string
  displayDate: string
  time: string
  timezone: string
  timezoneDisplay: string
}

// Get current quarter string
function getCurrentQuarter(): string {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()
  const quarter = Math.floor(month / 3) + 1
  return `Q${quarter} ${year}`
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
  onSubmitEOD: (report: Omit<EODReport, "id" | "createdAt" | "organizationId" | "date">) => void | Promise<void>
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
  const [textDump, setTextDump] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedEODData | null>(null)
  const [showPreview, setShowPreview] = useState(false)

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
  const currentQuarter = getCurrentQuarter()

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
      } catch (err) {
        console.error("Failed to fetch organization date:", err)
      }
    }
    fetchOrgDate()
    // Refresh every minute to keep time current
    const interval = setInterval(fetchOrgDate, 60000)
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
      } catch (err) {
        console.error("Failed to fetch active metric:", err)
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
        headers: { "Content-Type": "application/json" },
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
      ? parseInt(metricValueToday, 10)
      : null
    const validMetricValue = parsedMetricValue !== null && !isNaN(parsedMetricValue)
      ? parsedMetricValue
      : null

    // Note: We don't set the date here - the API will determine the correct date
    // based on the organization's timezone to ensure all team members submit for
    // the same day regardless of their local timezone
    const report: Omit<EODReport, "id" | "createdAt" | "organizationId" | "date"> = {
      userId,
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

      try {
        await sendEODNotification(report as EODReport, currentUser, allRocks)
      } catch (error) {
        console.error("Failed to send email notification:", error)
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

      toast({
        title: "EOD Report Submitted",
        description: "Your AI-generated EOD report has been recorded",
      })
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit EOD report",
        variant: "destructive",
      })
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
          <Sparkles className="h-5 w-5 text-purple-600" />
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
            {/* Date Banner - Shows what date users are submitting for */}
            {orgDateInfo && (
              <Alert className="bg-blue-50 border-blue-200">
                <Calendar className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Submitting for: </span>
                      <span className="font-semibold">{orgDateInfo.displayDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <Clock className="h-3 w-3" />
                      <span>{orgDateInfo.time} {orgDateInfo.timezoneDisplay}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="textDump" className="text-sm font-semibold text-slate-700">
                Paste Your Daily Tasks
              </Label>
              <Textarea
                id="textDump"
                placeholder={`Paste everything you accomplished today. Example:

- Updated the MedPros landing page with new testimonials
- Had a call with Sabbir about GHL automation progress
- Reviewed newsletter draft from Ailyn
- Set up new N8N workflow for lead routing
- Blocked on: waiting for client feedback on Voice AI demo

Tomorrow: finalize newsletter, follow up on MedPros campaign`}
                value={textDump}
                onChange={(e) => setTextDump(e.target.value)}
                rows={12}
                className="bg-white border-slate-200 focus:border-purple-300 font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Include tasks, blockers, challenges, and tomorrow's priorities. The AI will match them to your {currentQuarter} rocks.
              </p>
            </div>

            <Button
              onClick={handleParse}
              disabled={isParsing || !textDump.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse & Organize Tasks
                </>
              )}
            </Button>
          </>
        ) : (
          /* Preview & Edit Phase */
          <>
            {/* Date Banner - Shows what date users are submitting for */}
            {orgDateInfo && (
              <Alert className="bg-blue-50 border-blue-200">
                <Calendar className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Submitting for: </span>
                      <span className="font-semibold">{orgDateInfo.displayDate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-blue-600">
                      <Clock className="h-3 w-3" />
                      <span>{orgDateInfo.time} {orgDateInfo.timezoneDisplay}</span>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Summary & Warnings */}
            {parsedData && (
              <div className="space-y-3">
                {parsedData.summary && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-purple-800">{parsedData.summary}</p>
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
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
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
                        <Check className="h-4 w-4 text-emerald-500 mt-2.5 flex-shrink-0" />
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
                  <Target className="h-4 w-4 text-purple-600" />
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
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
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
