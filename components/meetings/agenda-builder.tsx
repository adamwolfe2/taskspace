"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from "@hello-pangea/dnd"
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

export function AgendaBuilder({ meetingId, disabled = false }: AgendaBuilderProps) {
  const { toast } = useToast()
  const [sections, setSections] = useState<AgendaSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalSections, setOriginalSections] = useState<AgendaSection[]>([])

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
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || disabled) return

    const items = Array.from(sections)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update order indices
    const updated = items.map((item, index) => ({
      ...item,
      orderIndex: index,
    }))

    setSections(updated)
    setHasChanges(true)
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
        headers: { "Content-Type": "application/json" },
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
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
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
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="agenda-sections" isDropDisabled={disabled}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {sections.map((section, index) => (
                  <Draggable
                    key={section.sectionType}
                    draggableId={section.sectionType}
                    index={index}
                    isDragDisabled={disabled}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`p-4 border rounded-lg ${
                          snapshot.isDragging
                            ? "shadow-lg bg-white"
                            : "bg-slate-50"
                        } ${disabled ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div {...provided.dragHandleProps}>
                            <GripVertical
                              className={`h-5 w-5 ${
                                disabled ? "text-slate-300" : "text-slate-400 cursor-grab"
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
                                  updateDuration(
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
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

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
