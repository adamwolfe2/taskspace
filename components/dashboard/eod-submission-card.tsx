"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, X, Send, Trash2 } from "lucide-react"
import type { Rock, EODReport, EODTask, EODPriority, TeamMember, AssignedTask } from "@/lib/types"
import { getTodayString } from "@/lib/utils/date-utils"
import { useToast } from "@/hooks/use-toast"
import { sendEODNotification } from "@/lib/email"

interface EODSubmissionCardProps {
  rocks: Rock[]
  allRocks: Rock[]
  onSubmitEOD: (report: Omit<EODReport, "id" | "createdAt">) => void
  userId: string
  currentUser: TeamMember
  assignedTasks: AssignedTask[]
}

export function EODSubmissionCard({
  rocks,
  allRocks,
  onSubmitEOD,
  userId,
  currentUser,
  assignedTasks,
}: EODSubmissionCardProps) {
  const completedTasksToday = assignedTasks.filter(
    (t) =>
      t.assigneeId === userId &&
      t.status === "completed" &&
      t.completedAt &&
      new Date(t.completedAt).toDateString() === new Date().toDateString(),
  )

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
    const autoPopulated = completedTasksToday.map((task) => ({
      id: crypto.randomUUID(),
      text: task.title,
      rockId: task.rockId,
      rockTitle: task.rockTitle,
    }))
    setAutoTasks(autoPopulated)
  }, [completedTasksToday.length])

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

    const report: Omit<EODReport, "id" | "createdAt"> = {
      userId,
      date: getTodayString(),
      submittedAt: new Date().toISOString(),
      tasks: allTasks,
      challenges: challenges.trim(),
      tomorrowPriorities: filteredPriorities,
      needsEscalation,
      escalationNote: needsEscalation ? escalationNote.trim() : null,
    }

    onSubmitEOD(report)

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

    toast({
      title: "EOD Report Submitted",
      description: "Your end of day report has been recorded",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submit EOD Report</CardTitle>
        <CardDescription>Share your daily progress and updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-populated tasks from completed tasks */}
        {autoTasks.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-semibold">From Completed Tasks ({autoTasks.length})</Label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              {autoTasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{task.text}</p>
                    {task.rockTitle && <p className="text-xs text-muted-foreground">Rock: {task.rockTitle}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeAutoTask(task.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manually added tasks */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Additional Tasks</Label>
          {tasks.map((task, index) => (
            <div key={task.id} className="space-y-2 p-3 border border-border rounded-lg">
              <div className="flex gap-2">
                <Input
                  placeholder="What did you accomplish?"
                  value={task.text}
                  onChange={(e) => updateTask(task.id, "text", e.target.value)}
                  className="flex-1"
                />
                {tasks.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeTask(task.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Select value={task.rockId || "none"} onValueChange={(value) => updateTask(task.id, "rockId", value)}>
                <SelectTrigger>
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
          <Button variant="outline" size="sm" onClick={addTask} className="w-full bg-transparent">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        {/* Challenges */}
        <div className="space-y-2">
          <Label htmlFor="challenges" className="text-base font-semibold">
            Challenges
          </Label>
          <Textarea
            id="challenges"
            placeholder="What challenges did you face today?"
            value={challenges}
            onChange={(e) => setChallenges(e.target.value)}
            rows={3}
          />
        </div>

        {/* Tomorrow's Priorities */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Tomorrow's Priorities</Label>
          {tomorrowPriorities.map((priority, index) => (
            <div key={priority.id} className="space-y-2 p-3 border border-border rounded-lg">
              <div className="flex gap-2">
                <Input
                  placeholder="What's your priority?"
                  value={priority.text}
                  onChange={(e) => {
                    setTomorrowPriorities(
                      tomorrowPriorities.map((p) => (p.id === priority.id ? { ...p, text: e.target.value } : p)),
                    )
                  }}
                  className="flex-1"
                />
                {tomorrowPriorities.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
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
                <SelectTrigger>
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
              className="w-full bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Priority
            </Button>
          )}
        </div>

        {/* Escalation */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="escalation"
              checked={needsEscalation}
              onCheckedChange={(checked) => setNeedsEscalation(checked as boolean)}
            />
            <Label htmlFor="escalation" className="cursor-pointer font-medium">
              Needs Escalation
            </Label>
          </div>
          {needsEscalation && (
            <Textarea
              placeholder="Describe what needs escalation..."
              value={escalationNote}
              onChange={(e) => setEscalationNote(e.target.value)}
              rows={2}
            />
          )}
        </div>

        <Button onClick={handleSubmit} className="w-full">
          <Send className="h-4 w-4 mr-2" />
          Submit EOD Report
        </Button>
      </CardContent>
    </Card>
  )
}
