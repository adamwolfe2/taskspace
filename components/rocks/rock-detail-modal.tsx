"use client"

import { useState } from "react"
import type { Rock, RockMilestone } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RockMilestoneManager } from "./rock-milestone-manager"
import { formatDate, getDaysUntil } from "@/lib/utils/date-utils"
import { Target, Calendar, AlertCircle, CheckCircle2, Clock, Pencil, Save, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"

// Calculate quarter from a date string (YYYY-MM-DD or ISO format)
function getQuarterFromDate(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  const quarter = Math.ceil(month / 3)
  return `Q${quarter} ${year}`
}

// Get rock's effective quarter (from due date, falling back to stored quarter)
function getRockQuarter(rock: Rock): string | null {
  // Calculate quarter from due date for accuracy
  if (rock.dueDate) {
    return getQuarterFromDate(rock.dueDate)
  }
  // Fall back to stored quarter if no due date
  return rock.quarter || null
}

interface RockDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rock: Rock
  onUpdateRock: (id: string, updates: Partial<Rock>) => Promise<Rock>
}

export function RockDetailModal({ open, onOpenChange, rock, onUpdateRock }: RockDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(rock.title)
  const [description, setDescription] = useState(rock.description)
  const [status, setStatus] = useState(rock.status)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const daysLeft = getDaysUntil(rock.dueDate)

  const getStatusConfig = (status: Rock["status"]) => {
    switch (status) {
      case "on-track":
        return { icon: CheckCircle2, label: "On Track", color: "text-emerald-600", bgColor: "bg-emerald-50" }
      case "at-risk":
        return { icon: Clock, label: "At Risk", color: "text-amber-600", bgColor: "bg-amber-50" }
      case "blocked":
        return { icon: AlertCircle, label: "Blocked", color: "text-red-600", bgColor: "bg-red-50" }
      case "completed":
        return { icon: CheckCircle2, label: "Completed", color: "text-slate-600", bgColor: "bg-slate-100" }
      default:
        return { icon: Target, label: "Unknown", color: "text-slate-600", bgColor: "bg-slate-100" }
    }
  }

  const statusConfig = getStatusConfig(rock.status)
  const StatusIcon = statusConfig.icon

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onUpdateRock(rock.id, { title, description, status })
      setIsEditing(false)
      toast({
        title: "Rock updated",
        description: "Your changes have been saved",
      })
    } catch (err: unknown) {
      toast({
        title: "Update failed",
        description: getErrorMessage(err, "Failed to update rock"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateMilestones = async (rockId: string, milestones: RockMilestone[]) => {
    const completedCount = milestones.filter((m) => m.completed).length
    const totalCount = milestones.length
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : rock.progress

    try {
      await onUpdateRock(rockId, { milestones, progress })
    } catch (err: unknown) {
      toast({
        title: "Update failed",
        description: getErrorMessage(err, "Failed to update milestones"),
        variant: "destructive",
      })
      throw err
    }
  }

  const handleCancel = () => {
    setTitle(rock.title)
    setDescription(rock.description)
    setStatus(rock.status)
    setIsEditing(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                <Target className={`h-5 w-5 ${statusConfig.color}`} />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {isEditing ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-xl font-semibold h-auto py-1"
                    />
                  ) : (
                    rock.title
                  )}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                  <span className={statusConfig.color}>{statusConfig.label}</span>
                  <span className="text-slate-300">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Due {formatDate(rock.dueDate)}
                    {daysLeft >= 0 ? (
                      <span className="text-slate-500">({daysLeft} days left)</span>
                    ) : (
                      <span className="text-red-500">({Math.abs(daysLeft)} days overdue)</span>
                    )}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={isEditing ? handleSave : () => setIsEditing(true)}
              disabled={isSaving}
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  {isSaving ? "Saving..." : "Save"}
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Overall Progress</span>
              <span className="font-semibold text-slate-900">{rock.progress}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  rock.progress >= 100
                    ? "bg-emerald-500"
                    : rock.progress >= 70
                      ? "bg-blue-500"
                      : rock.progress >= 40
                        ? "bg-amber-500"
                        : "bg-slate-400"
                }`}
                style={{ width: `${rock.progress}%` }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="font-medium text-slate-700">Description</Label>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-slate-50"
              />
            ) : (
              <p className="text-slate-600">{rock.description}</p>
            )}
          </div>

          {/* Status (edit mode) */}
          {isEditing && (
            <div className="space-y-2">
              <Label className="font-medium text-slate-700">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Rock["status"])}>
                <SelectTrigger className="bg-slate-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="at-risk">At Risk</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}

          {/* Milestones */}
          <div className="border-t pt-6">
            <RockMilestoneManager rock={rock} onUpdateMilestones={handleUpdateMilestones} />
          </div>

          {/* Metadata */}
          <div className="border-t pt-4 text-sm text-slate-500 space-y-1">
            {getRockQuarter(rock) && <p>Quarter: {getRockQuarter(rock)}</p>}
            {rock.outcome && <p>Expected Outcome: {rock.outcome}</p>}
            <p>Created: {formatDate(rock.createdAt)}</p>
            <p>Last Updated: {formatDate(rock.updatedAt)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
