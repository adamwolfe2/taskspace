"use client"

import { useState, useEffect, useCallback } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import {
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Users,
  Settings2,
  Send,
  MessageSquare,
  AlertTriangle,
  ExternalLink,
} from "lucide-react"
import { IntegrationLogo } from "@/components/ui/integration-logo"
import { useToast } from "@/hooks/use-toast"
import type { TeamMember } from "@/lib/types"

interface SlackUserMapping {
  userId: string
  userName: string
  slackUserId: string
  slackEmail?: string
  enabled: boolean
}

interface SlackStatus {
  installed: boolean
  enabled: boolean
  teamName: string
  linkedUsersCount: number
  totalMembers: number
  userMappings: SlackUserMapping[]
}

interface SlackBotIntegrationProps {
  teamMembers: TeamMember[]
}

export function SlackBotIntegration({ teamMembers }: SlackBotIntegrationProps) {
  const { currentOrganization, setCurrentOrganization } = useApp()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [slackStatus, setSlackStatus] = useState<SlackStatus | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [contextSource, setContextSource] = useState<"taskspace" | "taskspace_and_asana">("taskspace")
  const [userMappings, setUserMappings] = useState<SlackUserMapping[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [isRelinking, setIsRelinking] = useState(false)

  // Check for OAuth redirect params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("slack") === "connected") {
      toast({
        title: "Connected",
        description: "Slack bot has been successfully installed.",
      })
      window.history.replaceState({}, "", window.location.pathname)
    } else if (params.get("slack") === "error") {
      toast({
        title: "Connection failed",
        description: "Failed to connect Slack. Please try again.",
        variant: "destructive",
      })
      window.history.replaceState({}, "", window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast is stable; should only run on mount to check URL params
  }, [])

  // Load initial Slack status
  useEffect(() => {
    fetchSlackStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchSlackStatus is defined below with useCallback; can't add as dep due to declaration order
  }, [])

  // Load saved settings from organization
  useEffect(() => {
    if (currentOrganization?.settings?.slackBotIntegration) {
      const config = currentOrganization.settings.slackBotIntegration
      setIsEnabled(config.enabled ?? false)
      setReminderEnabled(config.reminderEnabled ?? false)
      setContextSource(config.contextSource ?? "taskspace")
    }
  }, [currentOrganization])

  const fetchSlackStatus = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/slack/admin")
      const json = await response.json()
      const status = json.data || json

      if (status && typeof status.installed !== "undefined") {
        setSlackStatus(status)
        if (status.userMappings) {
          setUserMappings(status.userMappings)
        }
        if (typeof status.enabled !== "undefined") {
          setIsEnabled(status.enabled)
        }
      } else {
        setSlackStatus({ installed: false, enabled: false, teamName: "", linkedUsersCount: 0, totalMembers: 0, userMappings: [] })
      }
    } catch {
      setSlackStatus({ installed: false, enabled: false, teamName: "", linkedUsersCount: 0, totalMembers: 0, userMappings: [] })
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch("/api/slack/oauth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "Failed to initiate OAuth")

      const { url } = json.data || json
      if (url) {
        window.location.href = url
      } else {
        throw new Error("No OAuth URL returned")
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to start Slack OAuth flow.",
        variant: "destructive",
      })
      setIsConnecting(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!currentOrganization) return

    setIsSaving(true)
    try {
      // Save Slack admin settings (user mappings, enabled state)
      const adminResponse = await fetch("/api/slack/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          enabled: isEnabled,
          userMappings,
        }),
      })

      if (!adminResponse.ok) throw new Error("Failed to save Slack admin settings")

      // Save org-level settings
      const orgResponse = await fetch("/api/organizations/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          slackBotIntegration: {
            enabled: isEnabled,
            contextSource,
            reminderEnabled,
          },
        }),
      })

      if (!orgResponse.ok) throw new Error("Failed to save organization settings")

      const json = await orgResponse.json()
      if (json.data) {
        setCurrentOrganization(json.data)
      }

      toast({
        title: "Settings saved",
        description: "Slack bot integration settings have been updated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save Slack settings.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestDM = async () => {
    setIsTesting(true)
    try {
      const response = await fetch("/api/slack/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "test_dm" }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "Failed to send test DM")

      toast({
        title: "Test DM sent",
        description: "Check your Slack for a test message from the bot.",
      })
    } catch (error) {
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "Failed to send test DM.",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch("/api/slack/admin", {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })

      if (!response.ok) throw new Error("Failed to disconnect Slack")

      setSlackStatus({ installed: false, enabled: false, teamName: "", linkedUsersCount: 0, totalMembers: 0, userMappings: [] })
      setUserMappings([])
      setIsEnabled(false)
      setReminderEnabled(false)
      setContextSource("taskspace")
      setShowDisconnectDialog(false)

      toast({
        title: "Disconnected",
        description: "Slack bot has been disconnected.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Slack.",
        variant: "destructive",
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleRelinkUsers = async () => {
    setIsRelinking(true)
    try {
      const response = await fetch("/api/slack/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ action: "link_users" }),
      })

      const json = await response.json()
      if (!response.ok) throw new Error(json.error || "Failed to re-link users")

      const result = json.data || json

      toast({
        title: "Users re-linked",
        description: `${result.linked ?? 0} new user${(result.linked ?? 0) !== 1 ? "s" : ""} matched by email.`,
      })

      // Refresh to get updated mappings
      fetchSlackStatus()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to re-link users.",
        variant: "destructive",
      })
    } finally {
      setIsRelinking(false)
    }
  }

  const toggleUserMapping = (aimsUserId: string, enabled: boolean) => {
    setUserMappings(prev =>
      prev.map(m =>
        m.userId === aimsUserId ? { ...m, enabled } : m
      )
    )
  }

  const asanaEnabled = currentOrganization?.settings?.asanaIntegration?.enabled ?? false

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" role="status" aria-label="Loading" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IntegrationLogo integration="slack" size="md" />
          Slack Bot Integration
        </CardTitle>
        <CardDescription>
          AI-powered EOD check-ins via Slack DMs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status Banner */}
        {slackStatus?.installed ? (
          <>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-green-800">
                  Connected to {slackStatus.teamName || "Slack"}
                </p>
                <p className="text-sm text-green-600">
                  {slackStatus.linkedUsersCount} user{slackStatus.linkedUsersCount !== 1 ? "s" : ""} auto-linked
                </p>
              </div>
              <Badge className="bg-green-500">Connected</Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchSlackStatus}
                aria-label="Refresh Slack status"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <Separator />

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Slack Bot</Label>
                <p className="text-sm text-muted-foreground">
                  Allow the bot to send check-in DMs to team members
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>

            {isEnabled && (
              <>
                <Separator />

                {/* Auto-Reminder Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Send Daily Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Bot will DM team members at their scheduled reminder time
                    </p>
                  </div>
                  <Switch
                    checked={reminderEnabled}
                    onCheckedChange={setReminderEnabled}
                  />
                </div>

                <Separator />

                {/* Context Source Dropdown */}
                <div className="space-y-2">
                  <Label>Context Source</Label>
                  <p className="text-xs text-muted-foreground">
                    Choose what data the bot uses when generating check-in summaries
                  </p>
                  <Select
                    value={contextSource}
                    onValueChange={(value: "taskspace" | "taskspace_and_asana") => setContextSource(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select context source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taskspace">
                        Taskspace Only
                      </SelectItem>
                      {asanaEnabled && (
                        <SelectItem value="taskspace_and_asana">
                          Taskspace + Asana
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {contextSource === "taskspace" && (
                    <p className="text-xs text-muted-foreground">
                      Pull rocks and tasks from Taskspace
                    </p>
                  )}
                  {contextSource === "taskspace_and_asana" && (
                    <p className="text-xs text-muted-foreground">
                      Also include Asana task context alongside Taskspace data
                    </p>
                  )}
                </div>

                <Separator />

                {/* User Mappings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <Label>User Mappings</Label>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRelinkUsers}
                      disabled={isRelinking}
                    >
                      {isRelinking ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Re-link Users
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Team members are auto-linked to Slack users by email. Toggle per-user DMs below.
                  </p>

                  <div className="space-y-3">
                    {teamMembers.filter(m => m.status === "active").map((member) => {
                      const mapping = userMappings.find(m => m.userId === member.id)

                      return (
                        <div key={member.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {mapping ? (
                              <>
                                <div className="text-right">
                                  <p className="text-sm text-green-700 font-medium">{mapping.userName}</p>
                                  <p className="text-xs text-green-600">Linked</p>
                                </div>
                                <Switch
                                  checked={mapping.enabled}
                                  onCheckedChange={(checked) => toggleUserMapping(member.id, checked)}
                                  aria-label={`Enable DMs for ${member.name}`}
                                />
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground">Not linked</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {userMappings.length > 0 && (
                    <p className="text-sm text-green-600">
                      {userMappings.filter(m => m.enabled).length} of {userMappings.length} linked user(s) will receive DMs
                    </p>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSaveSettings} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Save Settings
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleTestDM}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Test DM
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Disconnect */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDisconnectDialog(true)}
                disabled={isDisconnecting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Disconnect Slack
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not Connected State */}
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-purple-50 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-purple-600" />
              </div>
              <div className="text-center">
                <p className="font-medium">Connect Slack Bot</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Install the Taskspace bot to send AI-powered EOD check-in DMs to your team
                </p>
              </div>
              <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Connect to Slack
              </Button>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">What the Slack Bot Does</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Sends daily EOD check-in reminders via DM</li>
                <li>Collects task updates through conversational AI</li>
                <li>Auto-generates end-of-day summaries from your responses</li>
                <li>Links team members by email for seamless setup</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Disconnect Slack Bot?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will uninstall the Slack bot from your workspace
              {slackStatus?.teamName ? ` (${slackStatus.teamName})` : ""}.
              All user mappings will be removed and bot DMs will stop immediately.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
