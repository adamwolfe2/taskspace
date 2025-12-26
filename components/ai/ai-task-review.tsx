"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserInitials } from "@/components/shared/user-initials"
import { Check, X, Edit2, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react"
import type { AIGeneratedTask, TeamMember } from "@/lib/types"

interface AITaskReviewProps {
  tasks: AIGeneratedTask[]
  teamMembers: TeamMember[]
  onApprove: (taskId: string, updates?: Partial<AIGeneratedTask>) => Promise<void>
  onReject: (taskId: string) => Promise<void>
  onApproveAll: () => Promise<void>
  isLoading: boolean
}

function TaskCard({
  task,
  teamMembers,
  onApprove,
  onReject,
  isLoading,
}: {
  task: AIGeneratedTask
  teamMembers: TeamMember[]
  onApprove: (taskId: string, updates?: Partial<AIGeneratedTask>) => Promise<void>
  onReject: (taskId: string) => Promise<void>
  isLoading: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)
  const [editedDescription, setEditedDescription] = useState(task.description || "")
  const [editedPriority, setEditedPriority] = useState(task.priority)
  const [editedAssignee, setEditedAssignee] = useState(task.assigneeId)
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null)

  const member = teamMembers.find((m) => m.id === task.assigneeId)
  const selectedMember = teamMembers.find((m) => m.id === editedAssignee)

  const handleApprove = async () => {
    setActionLoading("approve")
    try {
      const updates: Partial<AIGeneratedTask> = {}
      if (editedTitle !== task.title) updates.title = editedTitle
      if (editedDescription !== task.description) updates.description = editedDescription
      if (editedPriority !== task.priority) updates.priority = editedPriority
      if (editedAssignee !== task.assigneeId) {
        updates.assigneeId = editedAssignee
        updates.assigneeName = selectedMember?.name
      }
      await onApprove(task.id, Object.keys(updates).length > 0 ? updates : undefined)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    setActionLoading("reject")
    try {
      await onReject(task.id)
    } finally {
      setActionLoading(null)
    }
  }

  const priorityColors = {
    urgent: "destructive",
    high: "destructive",
    medium: "warning",
    low: "secondary",
  } as const

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {isEditing ? (
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="font-medium"
            />
          ) : (
            <p className="font-medium">{task.title}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isEditing ? (
              <Select value={editedAssignee} onValueChange={setEditedAssignee}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                {member && <UserInitials name={member.name} size="sm" />}
                <span>{member?.name || task.assigneeName}</span>
              </div>
            )}

            {isEditing ? (
              <Select value={editedPriority} onValueChange={(v) => setEditedPriority(v as AIGeneratedTask["priority"])}>
                <SelectTrigger className="w-[100px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={priorityColors[task.priority] || "secondary"}>
                {task.priority}
              </Badge>
            )}

            {task.dueDate && (
              <span className="text-xs">Due: {task.dueDate}</span>
            )}
          </div>

          {isEditing ? (
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Description (optional)"
              className="text-sm"
              rows={2}
            />
          ) : task.description ? (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          ) : null}

          <div className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2">
            <Sparkles className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
            <p className="text-muted-foreground">{task.context}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            className="h-8 w-8 p-0"
          >
            {isEditing ? <ChevronUp className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handleApprove}
            disabled={isLoading || actionLoading !== null}
            className="h-8 w-8 p-0 bg-success hover:bg-success/90"
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

export function AITaskReview({
  tasks,
  teamMembers,
  onApprove,
  onReject,
  onApproveAll,
  isLoading,
}: AITaskReviewProps) {
  const [showAll, setShowAll] = useState(false)

  const displayTasks = showAll ? tasks : tasks.slice(0, 5)

  if (tasks.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pending AI Tasks ({tasks.length})
          </CardTitle>
          <CardDescription>
            Review and approve AI-generated task suggestions
          </CardDescription>
        </div>
        {tasks.length > 1 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onApproveAll}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Approve All
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {displayTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            teamMembers={teamMembers}
            onApprove={onApprove}
            onReject={onReject}
            isLoading={isLoading}
          />
        ))}

        {tasks.length > 5 && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show {tasks.length - 5} More
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
