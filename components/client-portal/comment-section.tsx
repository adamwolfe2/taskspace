"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageSquare } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { EodComment } from "@/lib/types"

interface CommentSectionProps {
  reportId: string
  slug: string
  token: string
}

export function CommentSection({ reportId, slug, token }: CommentSectionProps) {
  const [comments, setComments] = useState<EodComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [content, setContent] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/client/${slug}/${token}/comments?reportId=${encodeURIComponent(reportId)}`
      )
      const data = await res.json()
      if (data.success) setComments(data.data ?? [])
    } catch {
      // Silently fail — non-critical
    } finally {
      setIsLoading(false)
    }
  }, [reportId, slug, token])

  useEffect(() => {
    loadComments()
  }, [loadComments])

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isPosting) return

    const optimistic: EodComment = {
      id: `temp-${Date.now()}`,
      eodReportId: reportId,
      organizationId: "",
      clientId: null,
      authorName: "You",
      isClient: true,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }

    setComments((prev) => [...prev, optimistic])
    setContent("")
    setIsPosting(true)
    setError(null)

    try {
      const res = await fetch(`/api/client/${slug}/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, content: content.trim() }),
      })
      if (!res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
        setError("Failed to post comment")
        setContent(optimistic.content)
        return
      }
      const data = await res.json()
      if (!data.success) {
        // Revert optimistic update
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
        setError(data.error || "Failed to post comment")
        setContent(optimistic.content)
        return
      }
      // Replace optimistic with real comment
      setComments((prev) => prev.map((c) => (c.id === optimistic.id ? data.data : c)))
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
      setError("Network error. Please try again.")
      setContent(optimistic.content)
    } finally {
      setIsPosting(false)
    }
  }

  return (
    <div className="border-t pt-4 mt-4 space-y-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" />
        Comments {comments.length > 0 && `(${comments.length})`}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {comments.length > 0 && (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5 text-sm">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium uppercase">
                    {(comment.authorName || "?")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-xs">{comment.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words mt-0.5">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handlePost} className="flex gap-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Leave a comment..."
              rows={2}
              maxLength={2000}
              className="flex-1 text-sm resize-none"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!content.trim() || isPosting}
              className="self-end"
            >
              {isPosting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
            </Button>
          </form>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </div>
  )
}
