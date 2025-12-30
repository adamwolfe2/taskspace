"use client"

import { useState } from "react"
import type { Rock, RockMilestone } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, X, GripVertical, Calendar } from "lucide-react"

interface RockMilestoneManagerProps {
  rock: Rock
  onUpdateMilestones: (rockId: string, milestones: RockMilestone[]) => Promise<void>
  compact?: boolean
}

export function RockMilestoneManager({ rock, onUpdateMilestones, compact = false }: RockMilestoneManagerProps) {
  const [milestones, setMilestones] = useState<RockMilestone[]>(rock.milestones || [])
  const [newMilestoneText, setNewMilestoneText] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const completedCount = milestones.filter((m) => m.completed).length
  const totalCount = milestones.length
  const progressFromMilestones = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const handleAddMilestone = async () => {
    if (!newMilestoneText.trim()) return

    const newMilestone: RockMilestone = {
      id: crypto.randomUUID(),
      text: newMilestoneText.trim(),
      completed: false,
    }

    const updatedMilestones = [...milestones, newMilestone]
    setMilestones(updatedMilestones)
    setNewMilestoneText("")
    setIsAdding(false)

    setIsSaving(true)
    try {
      await onUpdateMilestones(rock.id, updatedMilestones)
    } catch (err) {
      // Revert on error
      setMilestones(milestones)
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleMilestone = async (milestoneId: string) => {
    const updatedMilestones = milestones.map((m) =>
      m.id === milestoneId
        ? {
            ...m,
            completed: !m.completed,
            completedAt: !m.completed ? new Date().toISOString() : undefined,
          }
        : m
    )

    setMilestones(updatedMilestones)

    setIsSaving(true)
    try {
      await onUpdateMilestones(rock.id, updatedMilestones)
    } catch (err) {
      // Revert on error
      setMilestones(milestones)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveMilestone = async (milestoneId: string) => {
    const updatedMilestones = milestones.filter((m) => m.id !== milestoneId)
    setMilestones(updatedMilestones)

    setIsSaving(true)
    try {
      await onUpdateMilestones(rock.id, updatedMilestones)
    } catch (err) {
      // Revert on error
      setMilestones(milestones)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateMilestoneText = async (milestoneId: string, text: string) => {
    const updatedMilestones = milestones.map((m) =>
      m.id === milestoneId ? { ...m, text } : m
    )
    setMilestones(updatedMilestones)
  }

  const handleBlurMilestone = async () => {
    setIsSaving(true)
    try {
      await onUpdateMilestones(rock.id, milestones)
    } finally {
      setIsSaving(false)
    }
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Milestones</span>
          <span className="font-medium text-slate-700">
            {completedCount}/{totalCount}
          </span>
        </div>
        {totalCount > 0 && (
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progressFromMilestones}%` }}
            />
          </div>
        )}
        <div className="space-y-1">
          {milestones.slice(0, 3).map((milestone) => (
            <div key={milestone.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={milestone.completed}
                onCheckedChange={() => handleToggleMilestone(milestone.id)}
                className="h-3.5 w-3.5"
                disabled={isSaving}
              />
              <span
                className={`truncate ${milestone.completed ? "line-through text-slate-400" : "text-slate-600"}`}
              >
                {milestone.text}
              </span>
            </div>
          ))}
          {milestones.length > 3 && (
            <p className="text-xs text-slate-400">+{milestones.length - 3} more</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-slate-900">Milestones</h4>
          <p className="text-sm text-slate-500">
            {completedCount} of {totalCount} complete ({progressFromMilestones}%)
          </p>
        </div>
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      {totalCount > 0 && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressFromMilestones}%` }}
          />
        </div>
      )}

      <div className="space-y-2">
        {milestones.map((milestone) => (
          <div
            key={milestone.id}
            className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
              milestone.completed
                ? "bg-slate-50 border-slate-100"
                : "bg-white border-slate-200 hover:border-slate-300"
            }`}
          >
            <GripVertical className="h-4 w-4 text-slate-300 cursor-grab" />
            <Checkbox
              checked={milestone.completed}
              onCheckedChange={() => handleToggleMilestone(milestone.id)}
              disabled={isSaving}
            />
            <Input
              value={milestone.text}
              onChange={(e) => handleUpdateMilestoneText(milestone.id, e.target.value)}
              onBlur={handleBlurMilestone}
              className={`flex-1 border-0 p-0 h-auto focus-visible:ring-0 ${
                milestone.completed ? "line-through text-slate-400" : ""
              }`}
              disabled={isSaving}
            />
            {milestone.completedAt && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(milestone.completedAt).toLocaleDateString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-red-500"
              onClick={() => handleRemoveMilestone(milestone.id)}
              disabled={isSaving}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {isAdding && (
          <div className="flex items-center gap-2 p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50">
            <Input
              value={newMilestoneText}
              onChange={(e) => setNewMilestoneText(e.target.value)}
              placeholder="Enter milestone..."
              className="flex-1 bg-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddMilestone()
                if (e.key === "Escape") {
                  setIsAdding(false)
                  setNewMilestoneText("")
                }
              }}
            />
            <Button size="sm" onClick={handleAddMilestone} disabled={!newMilestoneText.trim() || isSaving}>
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false)
                setNewMilestoneText("")
              }}
            >
              Cancel
            </Button>
          </div>
        )}

        {milestones.length === 0 && !isAdding && (
          <div className="text-center py-6 text-slate-400">
            <p className="text-sm">No milestones yet</p>
            <p className="text-xs mt-1">Add milestones to track progress towards this rock</p>
          </div>
        )}
      </div>
    </div>
  )
}
