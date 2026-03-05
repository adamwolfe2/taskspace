"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  LayoutTemplate,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Clock,
  Star,
  StarOff,
  Save,
  X,
  Loader2,
  ChevronLeft,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import type { MeetingTemplate, MeetingTemplateSection } from "@/lib/types"
import type { SectionType } from "@/lib/db/meetings"

// ============================================
// CONSTANTS
// ============================================

const SECTION_NAMES: Record<SectionType, string> = {
  segue: "Segue",
  scorecard: "Scorecard",
  rocks: "Rocks Review",
  headlines: "Headlines",
  ids: "IDS (Issues)",
  conclude: "Conclude",
}

const SECTION_DESCRIPTIONS: Record<SectionType, string> = {
  segue: "Personal and professional good news",
  scorecard: "Review 5-15 weekly metrics",
  rocks: "Review quarterly goals and progress",
  headlines: "Share company news and updates",
  ids: "Identify, Discuss, and Solve issues",
  conclude: "Recap action items and rate meeting",
}

const DEFAULT_DURATIONS: Record<SectionType, number> = {
  segue: 5,
  scorecard: 5,
  rocks: 5,
  headlines: 5,
  ids: 60,
  conclude: 5,
}

const ALL_SECTION_TYPES: SectionType[] = [
  "segue",
  "scorecard",
  "rocks",
  "headlines",
  "ids",
  "conclude",
]

const DEFAULT_SECTIONS: MeetingTemplateSection[] = ALL_SECTION_TYPES.map((t, i) => ({
  sectionType: t,
  durationTarget: DEFAULT_DURATIONS[t],
  data: {},
}))

// ============================================
// TYPES
// ============================================

interface TemplateManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  /** Optional: current meeting sections to pre-fill when saving as template */
  currentSections?: Array<{ sectionType: SectionType; durationTarget: number }>
  /** Called when a template is selected to apply to a meeting */
  onApplyTemplate?: (template: MeetingTemplate) => void
}

type View = "list" | "create" | "edit"

// ============================================
// SORTABLE SECTION ROW
// ============================================

function SortableSectionRow({
  section,
  index,
  onUpdateDuration,
  onRemove,
}: {
  section: MeetingTemplateSection
  index: number
  onUpdateDuration: (sectionType: string, duration: number) => void
  onRemove: (sectionType: string) => void
}) {
  const sectionType = section.sectionType as SectionType
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.sectionType })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3 border rounded-lg ${isDragging ? "shadow-lg bg-white z-50" : "bg-slate-50"}`}
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-slate-400 cursor-grab active:cursor-grabbing" />
        </div>
        <Badge variant="outline" className="font-mono text-xs w-6 h-6 flex items-center justify-center p-0">
          {index + 1}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{SECTION_NAMES[sectionType]}</p>
          <p className="text-xs text-slate-500 truncate">{SECTION_DESCRIPTIONS[sectionType]}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Input
              type="number"
              min="1"
              max="120"
              value={section.durationTarget}
              onChange={(e) =>
                onUpdateDuration(section.sectionType, parseInt(e.target.value) || 1)
              }
              className="w-16 text-right pr-8 h-8 text-sm"
              aria-label={`Duration for ${SECTION_NAMES[sectionType]}`}
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
              min
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
            onClick={() => onRemove(section.sectionType)}
            aria-label={`Remove ${SECTION_NAMES[sectionType]}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TEMPLATE FORM (create + edit)
// ============================================

interface TemplateFormProps {
  initial?: MeetingTemplate
  workspaceId: string
  onSave: (template: MeetingTemplate) => void
  onCancel: () => void
  preseedSections?: MeetingTemplateSection[]
}

function TemplateForm({
  initial,
  workspaceId,
  onSave,
  onCancel,
  preseedSections,
}: TemplateFormProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(initial?.name || "")
  const [description, setDescription] = useState(initial?.description || "")
  const [isDefault, setIsDefault] = useState(initial?.isDefault || false)
  const [sections, setSections] = useState<MeetingTemplateSection[]>(
    initial?.sections?.length
      ? initial.sections
      : preseedSections?.length
      ? preseedSections
      : DEFAULT_SECTIONS
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const totalDuration = sections.reduce((sum, s) => sum + s.durationTarget, 0)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setSections((items) => {
      const oldIndex = items.findIndex((s) => s.sectionType === active.id)
      const newIndex = items.findIndex((s) => s.sectionType === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  const updateDuration = (sectionType: string, duration: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.sectionType === sectionType ? { ...s, durationTarget: duration } : s
      )
    )
  }

  const removeSection = (sectionType: string) => {
    setSections((prev) => prev.filter((s) => s.sectionType !== sectionType))
  }

  const addSection = (sectionType: SectionType) => {
    if (sections.some((s) => s.sectionType === sectionType)) return
    setSections((prev) => [
      ...prev,
      { sectionType, durationTarget: DEFAULT_DURATIONS[sectionType], data: {} },
    ])
  }

  const availableToAdd = ALL_SECTION_TYPES.filter(
    (t) => !sections.some((s) => s.sectionType === t)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({ title: "Name required", description: "Please enter a template name.", variant: "destructive" })
      return
    }
    if (sections.length === 0) {
      toast({ title: "Sections required", description: "Add at least one section.", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const url = initial
        ? `/api/meetings/templates/${initial.id}`
        : "/api/meetings/templates"
      const method = initial ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          sections,
          workspaceId,
          isDefault,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      toast({
        title: initial ? "Template updated" : "Template created",
        description: `"${name.trim()}" has been ${initial ? "updated" : "saved"} successfully.`,
      })
      onSave(data.data)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="template-name">Template Name</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Standard L10, Quick Check-in"
          maxLength={100}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="template-description">
          Description <span className="text-slate-400 font-normal">(optional)</span>
        </Label>
        <Textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Briefly describe when to use this template..."
          rows={2}
          maxLength={300}
        />
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Sections</Label>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">{totalDuration} min total</span>
          </div>
        </div>

        {sections.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center border border-dashed rounded-lg">
            No sections added yet. Add sections below.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.sectionType)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <SortableSectionRow
                    key={section.sectionType}
                    section={section}
                    index={index}
                    onUpdateDuration={updateDuration}
                    onRemove={removeSection}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add missing sections */}
        {availableToAdd.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {availableToAdd.map((t) => (
              <Button
                key={t}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => addSection(t)}
              >
                <Plus className="h-3 w-3 mr-1" />
                {SECTION_NAMES[t]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Set as default */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          role="checkbox"
          aria-checked={isDefault}
          onClick={() => setIsDefault((v) => !v)}
          className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 select-none"
        >
          {isDefault ? (
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
          ) : (
            <StarOff className="h-4 w-4 text-slate-400" />
          )}
          Set as default template for this workspace
        </button>
      </div>

      <Separator />

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {initial ? "Update Template" : "Save Template"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// ============================================
// TEMPLATE LIST ITEM
// ============================================

function TemplateListItem({
  template,
  onEdit,
  onDelete,
  onApply,
  deleting,
}: {
  template: MeetingTemplate
  onEdit: () => void
  onDelete: () => void
  onApply?: () => void
  deleting: boolean
}) {
  const totalDuration = template.sections.reduce((sum, s) => sum + s.durationTarget, 0)

  return (
    <div className="p-4 border rounded-lg space-y-2 bg-white hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{template.name}</span>
            {template.isDefault && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <Star className="h-3 w-3 mr-1 text-amber-400 fill-amber-400" />
                Default
              </Badge>
            )}
          </div>
          {template.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{template.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onEdit}
            aria-label="Edit template"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete template"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {totalDuration} min
          </span>
          <span>{template.sections.length} sections</span>
          <span className="truncate max-w-[180px]">
            {template.sections.map((s) => SECTION_NAMES[s.sectionType as SectionType]).join(" · ")}
          </span>
        </div>
        {onApply && (
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onApply}>
            Apply
          </Button>
        )}
      </div>
    </div>
  )
}

// ============================================
// MAIN TEMPLATE MANAGER DIALOG
// ============================================

export function TemplateManager({
  open,
  onOpenChange,
  workspaceId,
  currentSections,
  onApplyTemplate,
}: TemplateManagerProps) {
  const { toast } = useToast()
  const [view, setView] = useState<View>("list")
  const [templates, setTemplates] = useState<MeetingTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Reset view when dialog closes
  useEffect(() => {
    if (!open) {
      setView("list")
      setEditingTemplate(null)
    }
  }, [open])

  const loadTemplates = useCallback(async () => {
    if (!workspaceId) return
    setLoading(true)
    try {
      const res = await fetch(
        `/api/meetings/templates?workspaceId=${encodeURIComponent(workspaceId)}`,
        { headers: { "X-Requested-With": "XMLHttpRequest" } }
      )
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [workspaceId, toast])

  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open, loadTemplates])

  const handleSaved = (saved: MeetingTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((t) => t.id === saved.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = saved
        // Re-sort: default first, then by date
        return updated.sort((a, b) =>
          a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1
        )
      }
      return [saved, ...prev]
    })
    setView("list")
    setEditingTemplate(null)
  }

  const handleDelete = async (template: MeetingTemplate) => {
    setDeletingId(template.id)
    try {
      const res = await fetch(`/api/meetings/templates/${template.id}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setTemplates((prev) => prev.filter((t) => t.id !== template.id))
      toast({ title: "Template deleted", description: `"${template.name}" has been removed.` })
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete template",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (template: MeetingTemplate) => {
    setEditingTemplate(template)
    setView("edit")
  }

  const handleApply = (template: MeetingTemplate) => {
    onApplyTemplate?.(template)
    onOpenChange(false)
  }

  // Convert currentSections prop (from an active meeting) to MeetingTemplateSection[]
  const preseedSections: MeetingTemplateSection[] | undefined = currentSections?.map((s) => ({
    sectionType: s.sectionType,
    durationTarget: s.durationTarget,
    data: {},
  }))

  // Titles
  const dialogTitle =
    view === "list"
      ? "Meeting Templates"
      : view === "create"
      ? "Create Template"
      : "Edit Template"

  const dialogDescription =
    view === "list"
      ? "Save recurring agenda structures and apply them to new meetings."
      : view === "create"
      ? "Define sections, order, and default durations for this template."
      : `Editing "${editingTemplate?.name}"`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-blue-500" />
            <DialogTitle>{dialogTitle}</DialogTitle>
          </div>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="space-y-4">
            {/* Save current meeting as template */}
            {currentSections && currentSections.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3">
                <p className="text-sm text-blue-700">
                  Save the current meeting agenda as a reusable template.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-blue-300 text-blue-700 hover:bg-blue-100"
                  onClick={() => setView("create")}
                >
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save as Template
                </Button>
              </div>
            )}

            {/* Templates list */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 border rounded-lg space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg">
                <LayoutTemplate className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">No templates yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Create a template to quickly set up recurring meetings.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {templates.map((t) => (
                  <TemplateListItem
                    key={t.id}
                    template={t}
                    onEdit={() => handleEdit(t)}
                    onDelete={() => handleDelete(t)}
                    onApply={onApplyTemplate ? () => handleApply(t) : undefined}
                    deleting={deletingId === t.id}
                  />
                ))}
              </div>
            )}

            {/* Footer actions */}
            <div className="flex justify-end pt-2">
              <Button onClick={() => setView("create")}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>
        )}

        {/* CREATE VIEW */}
        {view === "create" && (
          <TemplateForm
            workspaceId={workspaceId}
            preseedSections={preseedSections}
            onSave={handleSaved}
            onCancel={() => setView("list")}
          />
        )}

        {/* EDIT VIEW */}
        {view === "edit" && editingTemplate && (
          <TemplateForm
            initial={editingTemplate}
            workspaceId={workspaceId}
            onSave={handleSaved}
            onCancel={() => {
              setView("list")
              setEditingTemplate(null)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
