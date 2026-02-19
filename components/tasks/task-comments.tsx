"use client"

import { useState } from "react"
import type { TaskComment, TeamMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { UserInitials } from "@/components/shared/user-initials"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Send } from "lucide-react"
import { useThemedIconColors } from "@/lib/hooks/use-themed-icon-colors"
import { useToast } from "@/hooks/use-toast"

interface TaskCommentsProps {
  comments: TaskComment[]
  currentUser: TeamMember
  onAddComment: (text: string) => Promise<void>
  compact?: boolean
}

export function TaskComments({ comments, currentUser, onAddComment, compact = false }: TaskCommentsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isSending, setIsSending] = useState(false)
  const themedColors = useThemedIconColors()
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    setIsSending(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment("")
    } catch {
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (compact) {
    return (
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs hover:opacity-80"
        style={{ color: themedColors.secondary }}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        {comments.length > 0 ? `${comments.length} comment${comments.length > 1 ? "s" : ""}` : "Add note"}
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" style={{ color: themedColors.secondary }} />
          Notes & Comments
          {comments.length > 0 && (
            <span className="text-xs" style={{ color: themedColors.secondary }}>({comments.length})</span>
          )}
        </h4>
      </div>

      {/* Comments list */}
      {comments.length > 0 && (
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`flex gap-2 p-2 rounded-lg ${
                comment.userId === currentUser.id ? "bg-blue-50" : "bg-slate-50"
              }`}
            >
              <UserInitials name={comment.userName} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {comment.userName}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">
                  {comment.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment form */}
      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note or comment..."
          rows={2}
          className="flex-1 text-sm resize-none"
          disabled={isSending}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSending}
          className="h-10 w-10 shrink-0"
          aria-label="Send comment"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Inline comment button for task cards
interface TaskCommentButtonProps {
  commentCount: number
  onClick: () => void
}

export function TaskCommentButton({ commentCount, onClick }: TaskCommentButtonProps) {
  const themedColors = useThemedIconColors()
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex items-center gap-1 text-xs hover:opacity-80 transition-colors"
      style={{ color: themedColors.secondary }}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      {commentCount > 0 && <span>{commentCount}</span>}
    </button>
  )
}
