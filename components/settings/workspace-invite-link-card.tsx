"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Link2, Copy, RefreshCw, CheckCheck, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WorkspaceInviteLinkCardProps {
  workspaceId: string
}

export function WorkspaceInviteLinkCard({ workspaceId }: WorkspaceInviteLinkCardProps) {
  const { toast } = useToast()

  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCopied, setIsCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const fetchLink = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite-link`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setUrl(data.data.url)
      } else {
        toast({
          title: "Failed to load invite link",
          description: data.error || "An error occurred",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Failed to load invite link",
        description: "Network error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, toast])

  useEffect(() => {
    fetchLink()
  }, [fetchLink])

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually.",
        variant: "destructive",
      })
    }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    setShowConfirm(false)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite-link`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        credentials: "include",
      })
      const data = await res.json()
      if (data.success) {
        setUrl(data.data.url)
        toast({
          title: "Invite link regenerated",
          description: "The old link is now invalid.",
        })
      } else {
        toast({
          title: "Failed to regenerate link",
          description: data.error || "An error occurred",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Failed to regenerate link",
        description: "Network error",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Invite Link
          </CardTitle>
          <CardDescription>
            Share this link to invite anyone to this workspace. The link never expires and can be
            regenerated to invalidate the old one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
                <Skeleton className="h-9 w-32 rounded-lg" />
              </div>
            </div>
          ) : url ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={url}
                  className="font-mono text-sm text-slate-600 bg-slate-50"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleCopy}
                  className="shrink-0"
                  disabled={isRegenerating}
                >
                  {isCopied ? (
                    <>
                      <CheckCheck className="h-4 w-4 mr-1.5 text-green-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={isRegenerating}
                className="text-slate-500 hover:text-slate-700"
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Regenerating…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Unable to load invite link.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate invite link?</AlertDialogTitle>
            <AlertDialogDescription>
              The current link will stop working immediately. Anyone with the old link will need
              the new one to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRegenerate}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
