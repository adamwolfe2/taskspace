"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { UserInitials } from "@/components/shared/user-initials"
import {
  Check,
  X,
  Edit2,
  ChevronUp,
  Loader2,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Target,
  Zap,
  Clock,
  Coins,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { AISuggestion, TeamMember } from "@/lib/types"

interface SuggestionCardProps {
  suggestion: AISuggestion
  teamMembers: TeamMember[]
  onApprove: (id: string, updates?: Partial<AISuggestion>) => Promise<void>
  onReject: (id: string, reason?: string) => Promise<void>
  isLoading: boolean
  selected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  showCheckbox?: boolean
}

const suggestionTypeIcons = {
  task: Zap,
  follow_up: MessageSquare,
  blocker: AlertCircle,
  alert: AlertCircle,
  rock_update: Target,
}

const suggestionTypeLabels = {
  task: "Task",
  follow_up: "Follow Up",
  blocker: "Blocker",
  alert: "Alert",
  rock_update: "Rock Update",
}

const priorityColors: Record<string, "destructive" | "warning" | "secondary"> = {
  urgent: "destructive",
  high: "destructive",
  medium: "warning",
  low: "secondary",
}

export function SuggestionCard({
  suggestion,
  teamMembers,
  onApprove,
  onReject,
  isLoading,
  selected = false,
  onSelect,
  showCheckbox = false,
}: SuggestionCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(suggestion.title)
  const [editedDescription, setEditedDescription] = useState(suggestion.description || "")
  const [editedPriority, setEditedPriority] = useState(suggestion.priority)
  const [editedAssignee, setEditedAssignee] = useState(suggestion.targetUserId || "")
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null)

  const TypeIcon = suggestionTypeIcons[suggestion.suggestionType] || Sparkles
  const member = teamMembers.find((m) => m.id === suggestion.targetUserId)
  const selectedMember = teamMembers.find((m) => m.id === editedAssignee)

  const handleApprove = async () => {
    setActionLoading("approve")
    try {
      const updates: Partial<AISuggestion> = {}
      if (editedTitle !== suggestion.title) updates.title = editedTitle
      if (editedDescription !== suggestion.description) updates.description = editedDescription
      if (editedPriority !== suggestion.priority) updates.priority = editedPriority
      if (editedAssignee !== suggestion.targetUserId) {
        updates.targetUserId = editedAssignee
        updates.targetUserName = selectedMember?.name
      }
      await onApprove(suggestion.id, Object.keys(updates).length > 0 ? updates : undefined)
    } finally {
      setActionLoading(null)
      setIsEditing(false)
    }
  }

  const handleReject = async () => {
    setActionLoading("reject")
    try {
      await onReject(suggestion.id)
    } finally {
      setActionLoading(null)
    }
  }

  // Calculate days until expiration
  const daysUntilExpiry = suggestion.expiresAt
    ? Math.ceil((new Date(suggestion.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div
      className={cn(
        "border rounded-lg p-4 space-y-3 bg-card transition-all",
        selected && "border-primary ring-1 ring-primary/20",
        !selected && "hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox for bulk selection */}
        {showCheckbox && onSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={(checked) => onSelect(suggestion.id, checked === true)}
            className="mt-1"
          />
        )}

        <div className="flex-1 space-y-2">
          {/* Header with type and title */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <TypeIcon className="h-4 w-4 text-primary" />
                <Badge variant="outline" className="text-xs">
                  {suggestionTypeLabels[suggestion.suggestionType]}
                </Badge>
                <Badge variant={priorityColors[suggestion.priority]}>
                  {suggestion.priority}
                </Badge>
                {suggestion.creditsCost > 0 && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Coins className="h-3 w-3" />
                    {suggestion.creditsCost}
                  </Badge>
                )}
              </div>

              {isEditing ? (
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="font-medium"
                />
              ) : (
                <p className="font-medium">{suggestion.title}</p>
              )}
            </div>

            {/* Confidence score */}
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Confidence</div>
              <div
                className={cn(
                  "text-sm font-medium",
                  suggestion.confidence >= 0.8
                    ? "text-success"
                    : suggestion.confidence >= 0.6
                    ? "text-warning"
                    : "text-muted-foreground"
                )}
              >
                {Math.round(suggestion.confidence * 100)}%
              </div>
            </div>
          </div>

          {/* Assignee and priority */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {isEditing ? (
              <>
                <Select value={editedAssignee} onValueChange={setEditedAssignee}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={editedPriority}
                  onValueChange={(v) => setEditedPriority(v as "low" | "medium" | "high")}
                >
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                {member && (
                  <div className="flex items-center gap-2">
                    <UserInitials name={member.name} size="sm" />
                    <span>{member.name}</span>
                  </div>
                )}
                {!member && suggestion.targetUserName && (
                  <span>{suggestion.targetUserName}</span>
                )}
              </>
            )}

            {daysUntilExpiry !== null && daysUntilExpiry <= 3 && (
              <div className="flex items-center gap-1 text-warning">
                <Clock className="h-3 w-3" />
                <span className="text-xs">
                  {daysUntilExpiry <= 0 ? "Expiring today" : `${daysUntilExpiry}d left`}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          {isEditing ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Description (optional)"
              className="text-sm"
              rows={2}
            />
          ) : suggestion.description ? (
            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
          ) : null}

          {/* Context from AI */}
          {suggestion.context && (
            <div className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2">
              <Sparkles className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
              <p className="text-muted-foreground">{suggestion.context}</p>
            </div>
          )}

          {/* Source info */}
          {suggestion.sourceText && (
            <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
              Source: {suggestion.sourceText}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            className="h-8 w-8 p-0"
            title={isEditing ? "Cancel edit" : "Edit before approving"}
          >
            {isEditing ? <ChevronUp className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleApprove}
            disabled={isLoading || actionLoading !== null}
            className="h-8 w-8 p-0 bg-success hover:bg-success/90"
            title="Approve suggestion"
          >
            {actionLoading === "approve" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading || actionLoading !== null}
            className="h-8 w-8 p-0"
            title="Reject suggestion"
          >
            {actionLoading === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
