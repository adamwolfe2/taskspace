"use client"

import { useState } from "react"
import type { Rock, TaskRecurrence } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Repeat } from "lucide-react"

interface AddTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (taskData: {
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
    recurrence?: TaskRecurrence
  }) => void
  userRocks: Rock[]
}

export function AddTaskModal({ open, onOpenChange, onSubmit, userRocks }: AddTaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rockId, setRockId] = useState<string | null>(null)
  const [priority, setPriority] = useState<"high" | "medium" | "normal">("normal")
  const [dueDate, setDueDate] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)

  const handleSubmit = () => {
    if (!title.trim() || !dueDate) return

    const selectedRock = rockId ? userRocks.find((r) => r.id === rockId) : null

    const recurrence: TaskRecurrence | undefined = isRecurring
      ? {
          type: recurrenceType,
          interval: recurrenceInterval,
        }
      : undefined

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      rockId: rockId,
      rockTitle: selectedRock?.title || null,
      priority,
      dueDate,
      recurrence,
    })

    setTitle("")
    setDescription("")
    setRockId(null)
    setPriority("normal")
    setDueDate("")
    setIsRecurring(false)
    setRecurrenceType("weekly")
    setRecurrenceInterval(1)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>Create a personal task or to-do</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you need to do?"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="rock">Related Rock</Label>
            <Select value={rockId || "none"} onValueChange={(v) => setRockId(v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a rock (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No related rock</SelectItem>
                {userRocks.map((rock) => (
                  <SelectItem key={rock.id} value={rock.id}>
                    {rock.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="normal">🟢 Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date *</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Recurrence */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-slate-500" />
                <Label htmlFor="recurring" className="cursor-pointer">Recurring task</Label>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {isRecurring && (
              <div className="flex items-center gap-2 pl-6">
                <span className="text-sm text-slate-600">Repeat every</span>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center"
                />
                <Select value={recurrenceType} onValueChange={(v: any) => setRecurrenceType(v)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">day(s)</SelectItem>
                    <SelectItem value="weekly">week(s)</SelectItem>
                    <SelectItem value="monthly">month(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !dueDate}>
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
