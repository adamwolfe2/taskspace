"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, X, Save, Paperclip, Calendar, AlertTriangle, Loader2 } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority, FileAttachment } from "@/lib/types"
import { formatDate, getTodayInTimezone } from "@/lib/utils/date-utils"
import { useApp } from "@/lib/contexts/app-context"
import { useToast } from "@/hooks/use-toast"
import { FileTray } from "@/components/ui/file-tray"

interface EditEODModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: EODReport
  rocks: Rock[]
  onSave: (id: string, updates: Partial<EODReport>) => Promise<EODReport>
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00")
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

// Get valid date options for EOD (today, yesterday, 2 days ago)
function getValidDateOptions(todayInOrgTz: string): { value: string; label: string }[] {
  const today = new Date(todayInOrgTz + "T12:00:00")
  const options = []

  for (let i = 0; i <= 2; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

    let label = formatShortDate(dateStr)
    if (i === 0) label = `Today - ${label}`
    else if (i === 1) label = `Yesterday - ${label}`
    else label = `${i} days ago - ${label}`

    options.push({ value: dateStr, label })
  }

  return options
}

export function EditEODModal({ open, onOpenChange, report, rocks, onSave }: EditEODModalProps) {
  const { currentOrganization } = useApp()
  const orgTimezone = currentOrganization?.settings?.timezone || "America/Los_Angeles"
  const todayInOrgTz = getTodayInTimezone(orgTimezone)
  const dateOptions = getValidDateOptions(todayInOrgTz)

  const [tasks, setTasks] = useState<EODTask[]>([])
  const [challenges, setChallenges] = useState("")
  const [tomorrowPriorities, setTomorrowPriorities] = useState<EODPriority[]>([])
  const [needsEscalation, setNeedsEscalation] = useState(false)
  const [escalationNote, setEscalationNote] = useState("")
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [reportDate, setReportDate] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Check if the current date is valid (within the 3-day window)
  const isDateValid = dateOptions.some(opt => opt.value === reportDate)
  const isDateChanged = reportDate !== report.date

  // Initialize form with report data when modal opens
  useEffect(() => {
    if (open && report) {
      setTasks(report.tasks.length > 0 ? [...report.tasks] : [{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }])
      setChallenges(report.challenges || "")
      setTomorrowPriorities(
        report.tomorrowPriorities.length > 0
          ? [...report.tomorrowPriorities]
          : [{ id: crypto.randomUUID(), text: "", rockId: null, rockTitle: null }]
      )
      setNeedsEscalation(report.needsEscalation)
      setEscalationNote(report.escalationNote || "")
      setAttachments(report.attachments || [])
      setReportDate(report.date)
    }
  }, [open, report])

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
      })
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
      })
    )
  }

  const handleSave = async () => {
    const filteredTasks = tasks.filter((t) => t.text.trim() !== "")

    if (filteredTasks.length === 0) {
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

    setIsSaving(true)
    try {
      await onSave(report.id, {
        tasks: filteredTasks,
        challenges: challenges.trim(),
        tomorrowPriorities: filteredPriorities,
        needsEscalation,
        escalationNote: needsEscalation ? escalationNote.trim() : null,
        attachments: attachments.length > 0 ? attachments : undefined,
        date: reportDate, // Include date change
      })

      const message = isDateChanged
        ? `EOD report moved from ${formatDate(report.date)} to ${formatDate(reportDate)}`
        : `EOD report for ${formatDate(report.date)} has been updated`

      toast({
        title: isDateChanged ? "Report Moved" : "Report Updated",
        description: message,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update EOD report",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit EOD Report</DialogTitle>
          <DialogDescription>
            Editing report for {formatDate(report.date)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Date Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              Report Date
            </Label>
            <Select value={reportDate} onValueChange={setReportDate}>
              <SelectTrigger className={`bg-white border-slate-200 ${isDateChanged ? 'border-amber-400 ring-1 ring-amber-200' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {/* Show current date if it's outside the valid window */}
                {!isDateValid && (
                  <SelectItem value={report.date} disabled>
                    {formatDate(report.date)} (original - cannot edit)
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {isDateChanged && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3" />
                Report will be moved from {formatDate(report.date)} to {formatDate(reportDate)}
              </p>
            )}
            {!isDateValid && (
              <p className="text-xs text-slate-500 mt-1">
                This report is from {formatDate(report.date)} which is outside the editable window.
                You can still edit the content, but the date cannot be changed.
              </p>
            )}
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">Completed Tasks</Label>
            {tasks.map((task) => (
              <div key={task.id} className="space-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="What did you accomplish?"
                    value={task.text}
                    onChange={(e) => updateTask(task.id, "text", e.target.value)}
                    className="flex-1 bg-white border-slate-200"
                  />
                  {tasks.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => removeTask(task.id)}
                    >
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
            <Button
              variant="outline"
              size="sm"
              onClick={addTask}
              className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          {/* Challenges */}
          <div className="space-y-2">
            <Label htmlFor="edit-challenges" className="text-sm font-semibold text-slate-700">
              Challenges
            </Label>
            <Textarea
              id="edit-challenges"
              placeholder="What challenges did you face?"
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              rows={3}
              className="bg-white border-slate-200 focus:border-blue-300"
            />
          </div>

          {/* Attachments */}
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

          {/* Tomorrow's Priorities */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">Tomorrow's Priorities</Label>
            {tomorrowPriorities.map((priority) => (
              <div key={priority.id} className="space-y-2 p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="What's your priority?"
                    value={priority.text}
                    onChange={(e) => updatePriority(priority.id, "text", e.target.value)}
                    className="flex-1 bg-white border-slate-200"
                  />
                  {tomorrowPriorities.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={() => removePriority(priority.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Select
                  value={priority.rockId || "none"}
                  onValueChange={(value) => updatePriority(priority.id, "rockId", value)}
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
                onClick={addPriority}
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
                id="edit-escalation"
                checked={needsEscalation}
                onCheckedChange={(checked) => setNeedsEscalation(checked as boolean)}
                className="border-amber-300"
              />
              <Label htmlFor="edit-escalation" className="cursor-pointer font-medium text-amber-800">
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

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800">
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
