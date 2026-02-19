"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Webhook,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Copy,
  Eye,
  EyeOff,
  BarChart3,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

const WEBHOOK_EVENT_TYPES = [
  { value: "task.created", label: "Task Created", category: "Tasks" },
  { value: "task.updated", label: "Task Updated", category: "Tasks" },
  { value: "task.completed", label: "Task Completed", category: "Tasks" },
  { value: "task.deleted", label: "Task Deleted", category: "Tasks" },
  { value: "rock.created", label: "Rock Created", category: "Rocks" },
  { value: "rock.updated", label: "Rock Updated", category: "Rocks" },
  { value: "rock.completed", label: "Rock Completed", category: "Rocks" },
  { value: "eod.submitted", label: "EOD Submitted", category: "EOD Reports" },
  { value: "eod.approved", label: "EOD Approved", category: "EOD Reports" },
  { value: "member.joined", label: "Member Joined", category: "Members" },
  { value: "member.removed", label: "Member Removed", category: "Members" },
] as const

interface WebhookData {
  id: string
  name: string
  url: string
  events: string[]
  secret: string
  headers: Record<string, string>
  enabled: boolean
  workspaceId: string | null
  scope: "workspace" | "organization"
  lastTriggeredAt: string | null
  failureCount: number
  deliveryStats: {
    total_deliveries: number
    successful: number
    failed: number
    pending: number
  }
  createdAt: string
  updatedAt: string
}

export function WebhookManagement() {
  const { toast } = useToast()
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Create form state
  const [formName, setFormName] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formEvents, setFormEvents] = useState<string[]>([])

  const loadWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks")
      if (!res.ok) throw new Error("Failed to load webhooks")
      const data = await res.json()
      setWebhooks(data.data?.webhooks || [])
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadWebhooks()
  }, [loadWebhooks])

  const handleCreate = async () => {
    if (!formName.trim() || !formUrl.trim() || formEvents.length === 0) {
      toast({
        title: "Missing fields",
        description: "Name, URL, and at least one event are required.",
        variant: "destructive",
      })
      return
    }

    try {
      const url = new URL(formUrl.trim())
      if (url.protocol !== 'https:') {
        toast({ title: "Invalid URL", description: "Webhook URL must use HTTPS", variant: "destructive" })
        return
      }
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid URL", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          name: formName.trim(),
          url: formUrl.trim(),
          events: formEvents,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error?.message || "Failed to create webhook")
      }

      toast({ title: "Webhook created", description: "Your webhook endpoint has been configured." })
      setShowCreateDialog(false)
      resetForm()
      loadWebhooks()
    } catch (error) {
      toast({
        title: "Error creating webhook",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (webhook: WebhookData) => {
    try {
      const res = await fetch(`/api/webhooks?id=${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ enabled: !webhook.enabled }),
      })
      if (!res.ok) throw new Error("Failed to update webhook")
      setWebhooks((prev) =>
        prev.map((w) => (w.id === webhook.id ? { ...w, enabled: !w.enabled } : w))
      )
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!webhookToDelete) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/webhooks?id=${webhookToDelete.id}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      if (!res.ok) throw new Error("Failed to delete webhook")
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookToDelete.id))
      toast({ title: "Webhook deleted" })
      setWebhookToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegenerateSecret = async (webhook: WebhookData) => {
    try {
      const res = await fetch(`/api/webhooks?id=${webhook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ regenerateSecret: true }),
      })
      if (!res.ok) throw new Error("Failed to regenerate secret")
      toast({ title: "Secret regenerated", description: "The webhook signing secret has been rotated." })
      loadWebhooks()
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      })
    }
  }

  const toggleEvent = (eventValue: string) => {
    setFormEvents((prev) =>
      prev.includes(eventValue) ? prev.filter((e) => e !== eventValue) : [...prev, eventValue]
    )
  }

  const resetForm = () => {
    setFormName("")
    setFormUrl("")
    setFormEvents([])
  }

  const eventCategories = WEBHOOK_EVENT_TYPES.reduce(
    (acc, event) => {
      if (!acc[event.category]) acc[event.category] = []
      acc[event.category].push(event)
      return acc
    },
    {} as Record<string, typeof WEBHOOK_EVENT_TYPES[number][]>
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <div>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Send real-time notifications to external services when events occur
                </CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              disabled={webhooks.length >= 10}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-6 w-36" />
              {/* Webhook card skeletons */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
                <Skeleton className="h-3 w-64" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-6 w-10 rounded-full" />
                </div>
                <Skeleton className="h-3 w-56" />
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No webhooks configured</p>
              <p className="text-xs mt-1">
                Add a webhook to send real-time event notifications to your services.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <WebhookRow
                  key={webhook.id}
                  webhook={webhook}
                  onToggle={() => handleToggle(webhook)}
                  onDelete={() => setWebhookToDelete(webhook)}
                  onRegenerateSecret={() => handleRegenerateSecret(webhook)}
                />
              ))}
              {webhooks.length >= 10 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Maximum of 10 webhooks per organization reached.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure an endpoint to receive event notifications via HTTP POST.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                placeholder="e.g., Slack Notifications"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://example.com/webhooks"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">Must be a public HTTPS URL.</p>
            </div>
            <div className="space-y-3">
              <Label>Events</Label>
              {Object.entries(eventCategories).map(([category, events]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{category}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {events.map((event) => (
                      <label
                        key={event.value}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={formEvents.includes(event.value)}
                          onCheckedChange={() => toggleEvent(event.value)}
                        />
                        {event.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false) }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Create Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!webhookToDelete} onOpenChange={() => setWebhookToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{webhookToDelete?.name}"</strong> and
              stop all event deliveries to this endpoint. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function WebhookRow({
  webhook,
  onToggle,
  onDelete,
  onRegenerateSecret,
}: {
  webhook: WebhookData
  onToggle: () => void
  onDelete: () => void
  onRegenerateSecret: () => void
}) {
  const [showSecret, setShowSecret] = useState(false)
  const { toast } = useToast()

  const stats = webhook.deliveryStats
  const successRate =
    stats.total_deliveries > 0
      ? Math.round((stats.successful / stats.total_deliveries) * 100)
      : null

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium truncate">{webhook.name}</h4>
            <Badge variant={webhook.enabled ? "default" : "secondary"} className="text-xs">
              {webhook.enabled ? "Active" : "Paused"}
            </Badge>
            {webhook.failureCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {webhook.failureCount} failures
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{webhook.url}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Switch checked={webhook.enabled} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete} aria-label="Delete webhook">
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </div>

      {/* Events */}
      <div className="flex flex-wrap gap-1">
        {webhook.events.map((event) => (
          <Badge key={event} variant="outline" className="text-xs font-normal">
            {event}
          </Badge>
        ))}
      </div>

      {/* Secret & Stats Row */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Secret:</span>
          <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
            {showSecret ? webhook.secret : "••••••••••••••••"}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 touch-target"
            onClick={() => setShowSecret(!showSecret)}
            aria-label={showSecret ? "Hide secret" : "Show secret"}
          >
            {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 touch-target"
            onClick={() => {
              navigator.clipboard.writeText(webhook.secret)
              toast({ title: "Copied to clipboard" })
            }}
            aria-label="Copy secret"
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-5 text-xs px-1.5 touch-target" onClick={onRegenerateSecret}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Rotate
          </Button>
        </div>

        {stats.total_deliveries > 0 && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {stats.total_deliveries} deliveries
            </span>
            {successRate !== null && (
              <span className={successRate >= 95 ? "text-green-600" : successRate >= 80 ? "text-yellow-600" : "text-red-600"}>
                {successRate}% success
              </span>
            )}
          </div>
        )}
      </div>

      {webhook.lastTriggeredAt && (
        <p className="text-xs text-muted-foreground">
          Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}
