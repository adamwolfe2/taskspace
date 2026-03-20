"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Bug, Loader2, CheckCircle2 } from "lucide-react"
import { useApp } from "@/lib/contexts/app-context"
import { toast } from "@/hooks/use-toast"

export function BugReporter() {
  const { currentUser, currentPage } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please describe the bug you encountered",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Collect diagnostic data
      const bugData = {
        description: description.trim(),
        page: currentPage,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        user: {
          id: currentUser?.id,
          email: currentUser?.email,
          name: currentUser?.name,
        },
        // Capture any console errors from the last few seconds
        consoleErrors: [], // Could be enhanced to capture actual console errors
      }

      const response = await fetch("/api/bugs/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(bugData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to submit bug report")
      }

      setSubmitted(true)
      toast({
        title: "Bug reported",
        description: `Issue #${data.data.issueNumber} created. Thank you for helping improve TaskSpace.`,
      })

      // Reset after 2 seconds
      setTimeout(() => {
        setIsOpen(false)
        setDescription("")
        setSubmitted(false)
      }, 2000)
    } catch (error) {
      toast({
        title: "Failed to submit",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="fixed bottom-4 right-4 z-50 shadow-lg bg-background border"
        >
          <Bug className="h-4 w-4 mr-2" />
          Report Bug
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>
            Help us improve TaskSpace by reporting issues you encounter.
            This will create a GitHub issue for our team to review.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Thank you!</h3>
            <p className="text-sm text-muted-foreground">
              Your bug report has been submitted successfully.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="description">What went wrong?</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the bug you encountered... (e.g., 'When I clicked the Save button on the Rocks page, nothing happened and I got an error message')"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Auto-captured:</strong></p>
                <p>• Page: {currentPage}</p>
                <p>• URL: {typeof window !== 'undefined' ? window.location.pathname : ''}</p>
                <p>• User: {currentUser?.email}</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !description.trim()}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Bug Report
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
