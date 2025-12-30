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
import { Plus, X, Save } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority } from "@/lib/types"
import { formatDate } from "@/lib/utils/date-utils"
import { useToast } from "@/hooks/use-toast"

interface EditEODModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: EODReport
  rocks: Rock[]
  onSave: (id: string, updates: Partial<EODReport>) => Promise<EODReport>
}

export function EditEODModal({ open, onOpenChange, report, rocks, onSave }: EditEODModalProps) {
  const [tasks, setTasks] = useState<EODTask[]>([])
  const [challenges, setChallenges] = useState("")
  const [tomorrowPriorities, setTomorrowPriorities] = useState<EODPriority[]>([])
  const [needsEscalation, setNeedsEscalation] = useState(false)
  const [escalationNote, setEscalationNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

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
      })

      toast({
        title: "Report Updated",
        description: `EOD report for ${formatDate(report.date)} has been updated`,
      })
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Failed to update EOD report",
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
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
