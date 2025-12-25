"use client"

import { useState } from "react"
import type { Rock } from "@/lib/types"
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
  }) => void
  userRocks: Rock[]
}

export function AddTaskModal({ open, onOpenChange, onSubmit, userRocks }: AddTaskModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rockId, setRockId] = useState<string | null>(null)
  const [priority, setPriority] = useState<"high" | "medium" | "normal">("normal")
  const [dueDate, setDueDate] = useState("")

  const handleSubmit = () => {
    if (!title.trim() || !dueDate) return

    const selectedRock = rockId ? userRocks.find((r) => r.id === rockId) : null

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      rockId: rockId,
      rockTitle: selectedRock?.title || null,
      priority,
      dueDate,
    })

    setTitle("")
    setDescription("")
    setRockId(null)
    setPriority("normal")
    setDueDate("")
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
