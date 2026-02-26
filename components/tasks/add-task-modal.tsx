"use client"

import { useState, useEffect } from "react"
import type { AssignedTask, Rock, TaskRecurrence, TaskTemplate, Project } from "@/lib/types"
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
import { Repeat, FileText, Bookmark, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"

interface AddTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (taskData: {
    title: string
    description: string
    rockId: string | null
    rockTitle: string | null
    projectId: string | null
    projectName: string | null
    priority: "high" | "medium" | "normal"
    dueDate: string
    recurrence?: TaskRecurrence
  }) => void
  userRocks: Rock[]
  projects?: Project[]
  initialTask?: AssignedTask
}

export function AddTaskModal({ open, onOpenChange, onSubmit, userRocks, projects = [], initialTask }: AddTaskModalProps) {
  const isEditing = !!initialTask
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [rockId, setRockId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [priority, setPriority] = useState<"high" | "medium" | "normal">("normal")
  const [dueDate, setDueDate] = useState("")
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly">("weekly")
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)

  // Template state
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [_isLoadingTemplates, setIsLoadingTemplates] = useState(false)
  const [saveAsTemplate, setSaveAsTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [isSavingTemplate, setIsSavingTemplate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const themedColors = useThemedIconColors()

  // Pre-fill fields when editing an existing task
  useEffect(() => {
    if (open && initialTask) {
      setTitle(initialTask.title)
      setDescription(initialTask.description || "")
      setRockId(initialTask.rockId || null)
      setProjectId(initialTask.projectId || null)
      setPriority(initialTask.priority as "high" | "medium" | "normal")
      setDueDate(initialTask.dueDate || "")
      if (initialTask.recurrence) {
        setIsRecurring(true)
        setRecurrenceType(initialTask.recurrence.type)
        setRecurrenceInterval(initialTask.recurrence.interval)
      } else {
        setIsRecurring(false)
        setRecurrenceType("weekly")
        setRecurrenceInterval(1)
      }
    } else if (!open) {
      // Reset when closed
      setTitle("")
      setDescription("")
      setRockId(null)
      setProjectId(null)
      setPriority("normal")
      setDueDate("")
      setIsRecurring(false)
      setRecurrenceType("weekly")
      setRecurrenceInterval(1)
      setSaveAsTemplate(false)
      setTemplateName("")
    }
  }, [open, initialTask])

  // Load templates when modal opens
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch("/api/task-templates")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTemplates(data.data || [])
        }
      }
    } catch {
      // Template loading failed — non-critical, form works without templates
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const applyTemplate = (template: TaskTemplate) => {
    setTitle(template.title)
    setDescription(template.description || "")
    setPriority(template.priority)
    if (template.defaultRockId) {
      setRockId(template.defaultRockId)
    }
    if (template.recurrence) {
      setIsRecurring(true)
      setRecurrenceType(template.recurrence.type)
      setRecurrenceInterval(template.recurrence.interval)
    } else {
      setIsRecurring(false)
    }
    toast({
      title: "Template applied",
      description: `"${template.name}" loaded`,
    })
  }

  const saveTemplate = async () => {
    if (!templateName.trim() || !title.trim()) return

    setIsSavingTemplate(true)
    try {
      const recurrence: TaskRecurrence | undefined = isRecurring
        ? { type: recurrenceType, interval: recurrenceInterval }
        : undefined

      const response = await fetch("/api/task-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name: templateName.trim(),
          title: title.trim(),
          description: description.trim(),
          priority,
          defaultRockId: rockId,
          recurrence,
          isShared: false,
        }),
      })

      if (response.ok) {
        toast({
          title: "Template saved",
          description: `"${templateName}" saved for future use`,
        })
        loadTemplates()
        setSaveAsTemplate(false)
        setTemplateName("")
      } else {
        throw new Error("Failed to save template")
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      })
    } finally {
      setIsSavingTemplate(false)
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !dueDate) return

    const selectedRock = rockId ? userRocks.find((r) => r.id === rockId) : null
    const selectedProject = projectId ? projects.find((p) => p.id === projectId) : null

    const recurrence: TaskRecurrence | undefined = isRecurring
      ? {
          type: recurrenceType,
          interval: recurrenceInterval,
        }
      : undefined

    setIsSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        rockId: rockId,
        rockTitle: selectedRock?.title || null,
        projectId: projectId,
        projectName: selectedProject?.name || null,
        priority,
        dueDate,
        recurrence,
      })

      onOpenChange(false)
    } catch {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Task" : "Add New Task"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update your task details" : "Create a personal task or to-do"}</DialogDescription>
        </DialogHeader>

        {/* Template Picker */}
        {templates.length > 0 && (
          <div className="pb-3 border-b">
            <Label className="flex items-center gap-1.5 mb-2">
              <FileText className="h-3.5 w-3.5" />
              Use Template
            </Label>
            <Select onValueChange={(id) => {
              const template = templates.find(t => t.id === id)
              if (template) applyTemplate(template)
            }}>
              <SelectTrigger className="bg-slate-50">
                <SelectValue placeholder="Select a template to fill form..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <span className="flex items-center gap-2">
                      <Bookmark className="h-3 w-3" />
                      {template.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && title.trim() && dueDate && handleSubmit()}
              placeholder="What do you need to do?"
              autoFocus
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
              <SelectTrigger id="rock">
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

          <div>
            <Label htmlFor="project">Project</Label>
            <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
              <SelectTrigger id="project">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "high" | "medium" | "normal")}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
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
                <Repeat className="h-4 w-4" style={{ color: themedColors.secondary }} />
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
                <label htmlFor="recurrence-interval" className="text-sm text-slate-600">Repeat every</label>
                <Input
                  id="recurrence-interval"
                  type="number"
                  min={1}
                  max={30}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center"
                />
                <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as "daily" | "weekly" | "monthly")}>
                  <SelectTrigger id="recurrence-type" aria-label="Recurrence frequency" className="w-28">
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

          {/* Save as Template — only shown when creating new tasks */}
          {!isEditing && <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4" style={{ color: themedColors.secondary }} />
                <Label htmlFor="save-template" className="cursor-pointer">Save as template</Label>
              </div>
              <Switch
                id="save-template"
                checked={saveAsTemplate}
                onCheckedChange={setSaveAsTemplate}
                disabled={!title.trim()}
              />
            </div>

            {saveAsTemplate && (
              <div className="flex items-center gap-2 pl-6">
                <Input
                  id="template-name"
                  aria-label="Template name"
                  placeholder="Template name..."
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={saveTemplate}
                  disabled={!templateName.trim() || isSavingTemplate}
                  aria-label={isSavingTemplate ? "Saving template" : "Save template"}
                >
                  {isSavingTemplate ? (
                    <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Saving" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            )}
          </div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !dueDate || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isEditing ? "Saving..." : "Adding..."}
              </>
            ) : (
              isEditing ? "Save Changes" : "Add Task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
