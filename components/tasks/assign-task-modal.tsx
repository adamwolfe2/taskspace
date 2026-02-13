"use client"

import { useState, useEffect } from "react"
import type { Rock, TeamMember, Project } from "@/lib/types"
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
import { Checkbox } from "@/components/ui/checkbox"

interface AssignTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (taskData: {
    assigneeId: string
    assigneeName: string
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    projectId: string | null
    projectName: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
    sendEmail: boolean
  }) => void
  teamMembers: TeamMember[]
  allRocks: Rock[]
  currentUserId: string
  projects?: Project[]
}

export function AssignTaskModal({
  open,
  onOpenChange,
  onSubmit,
  teamMembers,
  allRocks,
  currentUserId,
  projects = [],
}: AssignTaskModalProps) {
  const [assigneeId, setAssigneeId] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rockId, setRockId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [priority, setPriority] = useState<"high" | "medium" | "normal">("medium")
  const [dueDate, setDueDate] = useState("")
  const [sendEmail, setSendEmail] = useState(false)

  const assignableMembers = teamMembers.filter((m) => m.id !== currentUserId)
  const assigneeRocks = assigneeId ? allRocks.filter((r) => r.userId === assigneeId) : []
  const selectedAssignee = teamMembers.find((m) => m.id === assigneeId)

  useEffect(() => {
    if (assigneeId) {
      setRockId(null)
    }
  }, [assigneeId])

  const handleSubmit = () => {
    if (!assigneeId || !title.trim() || !dueDate) return

    const selectedRock = rockId ? allRocks.find((r) => r.id === rockId) : null
    const selectedProject = projectId ? projects.find((p) => p.id === projectId) : null

    onSubmit({
      assigneeId,
      assigneeName: selectedAssignee?.name || "",
      title: title.trim(),
      description: description.trim(),
      rockId: rockId,
      rockTitle: selectedRock?.title || null,
      projectId: projectId,
      projectName: selectedProject?.name || null,
      priority,
      dueDate,
      sendEmail,
    })

    setAssigneeId("")
    setTitle("")
    setDescription("")
    setRockId(null)
    setProjectId(null)
    setPriority("medium")
    setDueDate("")
    setSendEmail(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Task to Team Member</DialogTitle>
          <DialogDescription>Create and assign a priority task</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="assignee">Assign To *</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {assignableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add context, links, or specific instructions..."
              rows={3}
            />
          </div>

          {assigneeId && (
            <div>
              <Label htmlFor="rock">Related Rock</Label>
              <Select value={rockId || "none"} onValueChange={(v) => setRockId(v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee's rock (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No related rock</SelectItem>
                  {assigneeRocks.map((rock) => (
                    <SelectItem key={rock.id} value={rock.id}>
                      {rock.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Showing rocks for {selectedAssignee?.name}</p>
            </div>
          )}

          <div>
            <Label htmlFor="project">Project</Label>
            <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.filter(p => p.status === "active" || p.status === "planning").map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "high" | "medium" | "normal")}>
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

          <div className="flex items-center space-x-2">
            <Checkbox id="email" checked={sendEmail} onCheckedChange={(checked) => setSendEmail(!!checked)} />
            <Label htmlFor="email" className="text-sm font-normal cursor-pointer">
              Send email notification to assignee
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!assigneeId || !title.trim() || !dueDate}>
            Assign Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
