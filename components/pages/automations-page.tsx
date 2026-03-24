"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

import { FeatureGate } from "@/components/shared/feature-gate"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Zap, Loader2, Trash2, History, ArrowRight } from "lucide-react"
import type { Automation, AutomationLog, AutomationTriggerType, AutomationAction } from "@/lib/types"

const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  task_completed: "Task Completed",
  eod_submitted: "EOD Submitted",
  rock_status_changed: "Rock Status Changed",
  meeting_ended: "Meeting Ended",
  scorecard_updated: "Scorecard Updated",
}

const ACTION_LABELS: Record<AutomationAction["type"], string> = {
  notify: "Send Notification",
  create_task: "Create Task",
  send_slack: "Send Slack Message",
  send_email: "Send Email",
}

export function AutomationsPage() {
  const { currentWorkspace } = useWorkspaces()
  const { toast } = useToast()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)

  // Create form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("task_completed")
  const [actionType, setActionType] = useState<AutomationAction["type"]>("notify")
  // Action config fields
  const [actionTitle, setActionTitle] = useState("")
  const [actionMessage, setActionMessage] = useState("")
  const [actionEmail, setActionEmail] = useState("")
  const [actionWebhook, setActionWebhook] = useState("")

  const workspaceId = currentWorkspace?.id

  const fetchAutomations = useCallback(async () => {
    if (!workspaceId) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/automations?workspaceId=${workspaceId}`)
      const data = await res.json()
      if (data.success) setAutomations(data.data || [])
    } catch {
      // ignore
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => { fetchAutomations() }, [fetchAutomations])

  const fetchLogs = async (automationId: string) => {
    try {
      const res = await fetch(`/api/automations/${automationId}/logs`)
      const data = await res.json()
      if (data.success) setLogs(data.data || [])
    } catch {
      // ignore
    }
  }

  const handleCreate = async () => {
    if (!workspaceId || !name) return
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          workspaceId,
          name,
          description: description || undefined,
          triggerType,
          triggerConfig: {},
          actions: [{ type: actionType, config: {
            ...(actionType === "notify" && {
              title: actionTitle || undefined,
              message: actionMessage || undefined,
            }),
            ...(actionType === "create_task" && {
              title: actionTitle || "Automated Task",
            }),
            ...(actionType === "send_email" && {
              to: actionEmail || undefined,
              subject: actionTitle || undefined,
              body: actionMessage || undefined,
            }),
            ...(actionType === "send_slack" && {
              webhookUrl: actionWebhook || undefined,
              message: actionMessage || undefined,
            }),
          } }],
        }),
      })
      if (!res.ok) {
        toast({ title: "Failed to create automation", variant: "destructive" })
        return
      }
      const data = await res.json()
      if (data.success) {
        setShowCreate(false)
        setName("")
        setDescription("")
        setActionTitle("")
        setActionMessage("")
        setActionEmail("")
        setActionWebhook("")
        fetchAutomations()
      }
    } catch {
      toast({ title: "Failed to create automation", variant: "destructive" })
    }
  }

  const handleToggle = async (id: string, isEnabled: boolean) => {
    const prev = automations
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, isEnabled } : a))
    try {
      const res = await fetch(`/api/automations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ isEnabled }),
      })
      if (!res.ok) {
        setAutomations(prev)
        toast({ title: "Failed to update automation", variant: "destructive" })
      }
    } catch {
      setAutomations(prev)
      toast({ title: "Failed to update automation", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/automations/${id}`, { method: "DELETE", headers: { "X-Requested-With": "XMLHttpRequest" } })
      if (!res.ok) {
        toast({ title: "Failed to delete automation", variant: "destructive" })
        return
      }
      setAutomations(prev => prev.filter(a => a.id !== id))
      if (selectedId === id) setSelectedId(null)
    } catch {
      toast({ title: "Failed to delete automation", variant: "destructive" })
    }
  }

  return (
    <FeatureGate feature="advanced.automations">
      <ErrorBoundary>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Automations</h1>
              <p className="text-muted-foreground">Create if-then rules to automate your workflows</p>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Automation</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Automation</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Notify on task completion" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this automation do?" rows={2} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">When this happens...</label>
                    <Select value={triggerType} onValueChange={v => setTriggerType(v as AutomationTriggerType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(TRIGGER_LABELS) as [AutomationTriggerType, string][]).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-sm">Then do this...</span>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Action</label>
                    <Select value={actionType} onValueChange={v => setActionType(v as AutomationAction["type"])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(Object.entries(ACTION_LABELS) as [AutomationAction["type"], string][]).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Action config fields */}
                  {actionType === "notify" && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Notification is sent to the user who triggered the event.</p>
                      <div>
                        <label className="text-sm font-medium">Title (optional)</label>
                        <Input value={actionTitle} onChange={e => setActionTitle(e.target.value)} placeholder="e.g., Task completed!" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Message (optional)</label>
                        <Input value={actionMessage} onChange={e => setActionMessage(e.target.value)} placeholder="e.g., Great work on finishing that task" />
                      </div>
                    </div>
                  )}
                  {actionType === "create_task" && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Task is assigned to the user who triggered the event.</p>
                      <div>
                        <label className="text-sm font-medium">Task Title</label>
                        <Input value={actionTitle} onChange={e => setActionTitle(e.target.value)} placeholder="e.g., Follow up on completed rock" />
                      </div>
                    </div>
                  )}
                  {actionType === "send_email" && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium">Recipient Email</label>
                        <Input type="email" value={actionEmail} onChange={e => setActionEmail(e.target.value)} placeholder="e.g., manager@company.com" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Subject</label>
                        <Input value={actionTitle} onChange={e => setActionTitle(e.target.value)} placeholder="e.g., EOD Report Submitted" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Body</label>
                        <Textarea value={actionMessage} onChange={e => setActionMessage(e.target.value)} placeholder="Email body..." rows={2} />
                      </div>
                    </div>
                  )}
                  {actionType === "send_slack" && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium">Slack Webhook URL</label>
                        <Input value={actionWebhook} onChange={e => setActionWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/..." />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Message (optional)</label>
                        <Input value={actionMessage} onChange={e => setActionMessage(e.target.value)} placeholder="e.g., A task was just completed!" />
                      </div>
                    </div>
                  )}

                  <Button onClick={handleCreate} disabled={!name} className="w-full">
                    Create Automation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : automations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No automations yet</p>
                <p className="text-sm">Create your first automation to streamline your workflow</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {automations.map(auto => (
                <Card key={auto.id} className={selectedId === auto.id ? "border-primary" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Switch
                          checked={auto.isEnabled}
                          onCheckedChange={v => handleToggle(auto.id, v)}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{auto.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {TRIGGER_LABELS[auto.triggerType] || auto.triggerType}
                            </Badge>
                            <ArrowRight className="h-3 w-3" />
                            {auto.actions.map((a, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {ACTION_LABELS[a.type] || a.type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span className="text-xs text-muted-foreground">{auto.runCount} runs</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedId(auto.id)
                            setShowLogs(true)
                            fetchLogs(auto.id)
                          }}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(auto.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Logs Dialog */}
          <Dialog open={showLogs} onOpenChange={setShowLogs}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Execution Log</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No executions yet</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <Badge variant={log.status === "success" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>
                          {log.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.executedAt).toLocaleString()}
                        </span>
                      </div>
                      {log.error && <p className="text-xs text-destructive mt-1">{log.error}</p>}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ErrorBoundary>
    </FeatureGate>
  )
}
