"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { Plus, Calendar, Loader2 } from "lucide-react"

interface QuickTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function QuickTaskDialog({ open, onOpenChange, userId }: QuickTaskDialogProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { currentWorkspace } = useWorkspaces()

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      // Reset form when closed
      setTitle("")
      setDueDate("")
    }
  }, [open])

  // Set default due date to today
  useEffect(() => {
    if (open && !dueDate) {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      setDueDate(`${year}-${month}-${day}`)
    }
  }, [open, dueDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (!currentWorkspace) {
      toast({
        title: "Error",
        description: "No workspace selected",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          assigneeId: userId,
          priority: "normal",
          dueDate: dueDate || new Date().toISOString().split("T")[0],
          type: "personal",
          workspaceId: currentWorkspace.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create task")
      }

      toast({
        title: "Task created",
        description: `"${title.trim()}" added to your tasks`,
      })

      onOpenChange(false)

      // Trigger a refresh of the tasks list
      window.dispatchEvent(new CustomEvent("task-created"))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Quick Add Task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title</Label>
            <Input
              ref={inputRef}
              id="task-title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Due Date (optional)
            </Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Tip: Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Cmd+Enter</kbd> to save quickly
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
