"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
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
  ClipboardList,
  GripVertical,
  Clock,
  Save,
  RotateCcw,
  Loader2,
} from "lucide-react"
import type { SectionType } from "@/lib/db/meetings"
import { useToast } from "@/hooks/use-toast"

interface AgendaSection {
  sectionType: SectionType
  orderIndex: number
  durationTarget: number
  completed?: boolean
  startedAt?: string
  endedAt?: string
}

interface AgendaBuilderProps {
  meetingId: string
  disabled?: boolean
}

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

// Sortable item component
function SortableSection({
  section,
  index,
  disabled,
  onUpdateDuration,
}: {
  section: AgendaSection
  index: number
  disabled: boolean
  onUpdateDuration: (sectionType: SectionType, duration: number) => void
}) {
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
      className={`p-4 border rounded-lg ${
        isDragging ? "shadow-lg bg-white z-50" : "bg-slate-50"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div {...attributes} {...listeners}>
          <GripVertical
            className={`h-5 w-5 ${
              disabled ? "text-slate-300" : "text-slate-400 cursor-grab active:cursor-grabbing"
            }`}
          />
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          #{index + 1}
        </Badge>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">
            {SECTION_NAMES[section.sectionType]}
          </h4>
          <p className="text-xs text-slate-500">
            {SECTION_DESCRIPTIONS[section.sectionType]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor={`duration-${section.sectionType}`} className="text-xs text-slate-600 whitespace-nowrap">
            Duration:
          </Label>
          <div className="relative">
            <Input
              id={`duration-${section.sectionType}`}
              type="number"
              min="1"
              max="120"
              value={section.durationTarget}
              onChange={(e) =>
                onUpdateDuration(
                  section.sectionType,
                  parseInt(e.target.value) || 1
                )
              }
              disabled={disabled}
              className="w-16 text-right pr-8"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              min
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AgendaBuilder({ meetingId, disabled = false }: AgendaBuilderProps) {
  const { toast } = useToast()
  const [sections, setSections] = useState<AgendaSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSections, setOriginalSections] = useState<AgendaSection[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load agenda
  const loadAgenda = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/meetings/${meetingId}/agenda`)
      const data = await res.json()
      if (data.success) {
        const sorted = [...data.data].sort((a, b) => a.orderIndex - b.orderIndex)
        setSections(sorted)
        setOriginalSections(JSON.parse(JSON.stringify(sorted)))
        setHasChanges(false)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load agenda",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgenda()
  }, [meetingId])

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || disabled) return

    setSections((items) => {
      const oldIndex = items.findIndex((item) => item.sectionType === active.id)
      const newIndex = items.findIndex((item) => item.sectionType === over.id)

      const reordered = arrayMove(items, oldIndex, newIndex)

      // Update order indices
      const updated = reordered.map((item, index) => ({
        ...item,
        orderIndex: index,
      }))

      setHasChanges(true)
      return updated
    })
  }

  // Update duration
  const updateDuration = (sectionType: SectionType, duration: number) => {
    if (disabled) return

    const updated = sections.map((section) =>
      section.sectionType === sectionType
        ? { ...section, durationTarget: duration }
        : section
    )
    setSections(updated)
    setHasChanges(true)
  }

  // Reset to defaults
  const resetToDefaults = () => {
    if (disabled) return

    const defaultSections: AgendaSection[] = [
      { sectionType: "segue", orderIndex: 0, durationTarget: DEFAULT_DURATIONS.segue },
      { sectionType: "scorecard", orderIndex: 1, durationTarget: DEFAULT_DURATIONS.scorecard },
      { sectionType: "rocks", orderIndex: 2, durationTarget: DEFAULT_DURATIONS.rocks },
      { sectionType: "headlines", orderIndex: 3, durationTarget: DEFAULT_DURATIONS.headlines },
      { sectionType: "ids", orderIndex: 4, durationTarget: DEFAULT_DURATIONS.ids },
      { sectionType: "conclude", orderIndex: 5, durationTarget: DEFAULT_DURATIONS.conclude },
    ]
    setSections(defaultSections)
    setHasChanges(true)
  }

  // Save agenda
  const saveAgenda = async () => {
    if (disabled) return

    setSaving(true)
    try {
      const res = await fetch(`/api/meetings/${meetingId}/agenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          sections: sections.map((s) => ({
            sectionType: s.sectionType,
            orderIndex: s.orderIndex,
            durationTarget: s.durationTarget,
          })),
        }),
      })

      const data = await res.json()
      if (data.success) {
        const sorted = [...data.data].sort((a, b) => a.orderIndex - b.orderIndex)
        setSections(sorted)
        setOriginalSections(JSON.parse(JSON.stringify(sorted)))
        setHasChanges(false)
        toast({
          title: "Agenda saved",
          description: "Meeting agenda has been updated successfully.",
        })
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save agenda",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Cancel changes
  const cancelChanges = () => {
    setSections(JSON.parse(JSON.stringify(originalSections)))
    setHasChanges(false)
  }

  const totalDuration = sections.reduce((sum, s) => sum + s.durationTarget, 0)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" role="status" aria-label="Loading" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-500" />
            <CardTitle>Meeting Agenda</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              <Clock className="h-3 w-3 mr-1" />
              {totalDuration} min total
            </Badge>
            {disabled && (
              <Badge variant="secondary">Meeting Started</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Customize the order and duration of each section
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.sectionType)}
            strategy={verticalListSortingStrategy}
            disabled={disabled}
          >
            <div className="space-y-2">
              {sections.map((section, index) => (
                <SortableSection
                  key={section.sectionType}
                  section={section}
                  index={index}
                  disabled={disabled}
                  onUpdateDuration={updateDuration}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={disabled || saving}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Button
                variant="ghost"
                onClick={cancelChanges}
                disabled={saving}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={saveAgenda}
              disabled={!hasChanges || disabled || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Agenda
                </>
              )}
            </Button>
          </div>
        </div>

        {disabled && (
          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            The agenda cannot be modified once the meeting has started.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
