"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Plus, GripVertical, Trash2, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TaskSubtask } from "@/lib/types"

interface TaskSubtasksProps {
  subtasks: TaskSubtask[]
  onAdd: (title: string) => Promise<void>
  onToggle: (subtaskId: string) => Promise<void>
  onDelete: (subtaskId: string) => Promise<void>
  onReorder?: (subtaskIds: string[]) => Promise<void>
  disabled?: boolean
  className?: string
}

export function TaskSubtasks({
  subtasks,
  onAdd,
  onToggle,
  onDelete,
  onReorder,
  disabled = false,
  className,
}: TaskSubtasksProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const completedCount = subtasks.filter((s) => s.completed).length
  const totalCount = subtasks.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const handleAdd = async () => {
    if (!newTitle.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAdd(newTitle.trim())
      setNewTitle("")
      setIsAdding(false)
    } catch (error) {
      console.error("Failed to add subtask:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    } else if (e.key === "Escape") {
      setNewTitle("")
      setIsAdding(false)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress Header */}
      {totalCount > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {completedCount}/{totalCount} done
          </span>
        </div>
      )}

      {/* Subtask List */}
      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className={cn(
              "group flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors",
              subtask.completed && "opacity-60"
            )}
          >
            {onReorder && (
              <GripVertical className="h-4 w-4 text-slate-300 dark:text-slate-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
            <Checkbox
              checked={subtask.completed}
              onCheckedChange={() => onToggle(subtask.id)}
              disabled={disabled}
              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
            <span
              className={cn(
                "flex-1 text-sm text-slate-700 dark:text-slate-300",
                subtask.completed && "line-through text-slate-400 dark:text-slate-500"
              )}
            >
              {subtask.title}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
              onClick={() => onDelete(subtask.id)}
              disabled={disabled}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add Subtask */}
      {isAdding ? (
        <div className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter subtask..."
            className="flex-1 h-8 text-sm"
            autoFocus
            disabled={isSubmitting}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleAdd}
            disabled={!newTitle.trim() || isSubmitting}
            className="h-8 px-2"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setNewTitle("")
              setIsAdding(false)
            }}
            disabled={isSubmitting}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAdding(true)}
          disabled={disabled}
          className="w-full justify-start text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add subtask
        </Button>
      )}
    </div>
  )
}

// Compact subtask display for task cards
export function SubtaskProgress({
  subtasks,
  className,
}: {
  subtasks: TaskSubtask[]
  className?: string
}) {
  const completedCount = subtasks.filter((s) => s.completed).length
  const totalCount = subtasks.length

  if (totalCount === 0) return null

  const progressPercent = (completedCount / totalCount) * 100

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            progressPercent === 100
              ? "bg-green-500"
              : progressPercent > 50
              ? "bg-blue-500"
              : "bg-amber-500"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {completedCount}/{totalCount}
      </span>
    </div>
  )
}
