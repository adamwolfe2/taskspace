"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Loader2 } from "lucide-react"

interface TaskRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  token: string
}

export function TaskRequestModal({ open, onOpenChange, slug, token }: TaskRequestModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/client/${slug}/${token}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || "Failed to submit request")
        return
      }
      setIsSuccess(true)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setTitle("")
      setDescription("")
      setIsSuccess(false)
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request a Task</DialogTitle>
          <DialogDescription>
            Submit a request to the team. They&apos;ll review and pick it up from the task pool.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
            <p className="font-medium">Request submitted!</p>
            <p className="text-sm text-muted-foreground">
              Your request has been submitted to the team.
            </p>
            <Button onClick={() => handleClose(false)} className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-title">Title *</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you need from the team?"
                maxLength={200}
                required
              />
              <p className="text-xs text-muted-foreground text-right">{title.length}/200</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-desc">Description</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional context (optional)"
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Priority:</span>
              <Badge variant="secondary">Normal</Badge>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim() || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
