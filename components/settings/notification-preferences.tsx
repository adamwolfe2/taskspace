"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Bell, Mail, MessageSquare, Loader2 } from "lucide-react"
import type { NotificationPreferences } from "@/lib/types"

interface NotificationPreferencesProps {
  memberId: string
  initialPreferences?: NotificationPreferences
}

const defaultPreferences: NotificationPreferences = {
  task_assigned: { email: true, inApp: true, slack: true },
  eod_reminder: { email: true, inApp: true, slack: false },
  escalation: { email: true, inApp: true, slack: true },
  rock_updated: { email: false, inApp: true, slack: false },
  digest: { email: true, slack: true },
}

const eventTypes = [
  { key: "task_assigned", label: "Task Assigned", description: "When a task is assigned to you" },
  { key: "eod_reminder", label: "EOD Reminder", description: "Daily reminder to submit EOD report" },
  { key: "escalation", label: "Escalations", description: "When someone escalates an issue" },
  { key: "rock_updated", label: "Rock Updates", description: "Changes to rocks you're following" },
  { key: "digest", label: "Daily Digest", description: "Team summary (email & Slack only)", noInApp: true },
] as const

export function NotificationPreferencesCard({ memberId, initialPreferences }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    initialPreferences || defaultPreferences
  )
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (initialPreferences) {
      setPreferences(initialPreferences)
    }
  }, [initialPreferences])

  const handleToggle = (
    eventType: keyof NotificationPreferences,
    channel: "email" | "inApp" | "slack",
    value: boolean
  ) => {
    setPreferences(prev => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [channel]: value,
      },
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ memberId, notificationPreferences: preferences }),
      })

      if (!response.ok) {
        throw new Error("Failed to save preferences")
      }

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      })
      setHasChanges(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleMuteAll = () => {
    const mutedPrefs: NotificationPreferences = {
      task_assigned: { email: false, inApp: true, slack: false },
      eod_reminder: { email: false, inApp: true, slack: false },
      escalation: { email: false, inApp: true, slack: false },
      rock_updated: { email: false, inApp: true, slack: false },
      digest: { email: false, slack: false },
    }
    setPreferences(mutedPrefs)
    setHasChanges(true)
  }

  const handleEnableAll = () => {
    setPreferences(defaultPreferences)
    setHasChanges(true)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified for different events
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleMuteAll}>
              Mute All
            </Button>
            <Button variant="outline" size="sm" onClick={handleEnableAll}>
              Enable All
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
            <div>Event Type</div>
            <div className="flex items-center justify-center gap-1">
              <Mail className="h-4 w-4" />
              Email
            </div>
            <div className="flex items-center justify-center gap-1">
              <Bell className="h-4 w-4" />
              In-App
            </div>
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Slack
            </div>
          </div>

          {/* Event type rows */}
          {eventTypes.map((eventType) => {
            const { key, label, description } = eventType
            const noInApp = 'noInApp' in eventType ? eventType.noInApp : false
            const prefs = preferences[key as keyof NotificationPreferences]
            return (
              <div key={key} className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
                <div>
                  <Label className="font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={"email" in prefs ? prefs.email : false}
                    onCheckedChange={(v) => handleToggle(key as keyof NotificationPreferences, "email", v)}
                  />
                </div>
                <div className="flex justify-center">
                  {noInApp ? (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  ) : (
                    <Switch
                      checked={"inApp" in prefs ? prefs.inApp : false}
                      onCheckedChange={(v) => handleToggle(key as keyof NotificationPreferences, "inApp", v)}
                    />
                  )}
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={"slack" in prefs ? prefs.slack : false}
                    onCheckedChange={(v) => handleToggle(key as keyof NotificationPreferences, "slack", v)}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {hasChanges && (
          <div className="flex justify-end mt-6 pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
