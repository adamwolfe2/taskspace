"use client"

import React, { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Loader2, Clock, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { api } from "@/lib/api/client"
import { NotificationPreferencesCard } from "./notification-preferences"
import { PushNotificationsCard } from "./push-notifications"
import { AsanaMemberConnection } from "./asana-member-connection"
import { IntegrationLogo } from "@/components/ui/integration-logo"
import type { TeamMember } from "@/lib/types"

const timezones = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
]

interface NotificationsTabProps {
  teamMembers: TeamMember[]
  setTeamMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
}

export function NotificationsTab({ teamMembers, setTeamMembers }: NotificationsTabProps) {
  const { currentUser, currentOrganization, setCurrentOrganization } = useApp()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSavingPersonal, setIsSavingPersonal] = useState(false)

  const isOwner = currentUser?.role === "owner"

  // Personal preferences state
  const [personalTimezone, setPersonalTimezone] = useState<string>("")
  const [personalReminderTime, setPersonalReminderTime] = useState<string>("")

  // Organization settings state
  const [emailNotifications, setEmailNotifications] = useState(
    currentOrganization?.settings.enableEmailNotifications ?? true
  )
  const [slackIntegration, setSlackIntegration] = useState(
    currentOrganization?.settings.enableSlackIntegration ?? false
  )
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(
    currentOrganization?.settings.slackWebhookUrl || ""
  )
  const [teamToolsUrl, setTeamToolsUrl] = useState(currentOrganization?.settings.teamToolsUrl || "")

  // Load personal preferences from team members data
  useEffect(() => {
    if (currentUser && teamMembers.length > 0) {
      const member = teamMembers.find((m) => m.id === currentUser.id)
      if (member) {
        setPersonalTimezone(member.timezone || "")
        setPersonalReminderTime(member.eodReminderTime || "")
      }
    }
  }, [currentUser, teamMembers])

  // Save personal preferences
  const handleSavePersonalPreferences = async () => {
    if (!currentUser) return

    try {
      setIsSavingPersonal(true)
      const response = await fetch("/api/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          memberId: currentUser.id,
          timezone: personalTimezone || null,
          eodReminderTime: personalReminderTime || null,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to save preferences")
      }

      // Update local state
      setTeamMembers((prev) =>
        prev.map((m) =>
          m.id === currentUser.id
            ? { ...m, timezone: personalTimezone, eodReminderTime: personalReminderTime }
            : m
        )
      )

      toast({
        title: "Preferences saved",
        description: "Your personal notification settings have been updated.",
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to save preferences"),
        variant: "destructive",
      })
    } finally {
      setIsSavingPersonal(false)
    }
  }

  // Save organization settings
  const handleSaveOrganization = async () => {
    if (!isOwner) return

    try {
      setIsLoading(true)
      const updated = await api.organizations.update({
        name: currentOrganization?.name || "",
        settings: {
          ...currentOrganization?.settings,
          timezone: currentOrganization?.settings.timezone || "America/New_York",
          weekStartDay: currentOrganization?.settings.weekStartDay ?? 1,
          eodReminderTime: currentOrganization?.settings.eodReminderTime || "17:00",
          enableEmailNotifications: emailNotifications,
          enableSlackIntegration: slackIntegration,
          slackWebhookUrl: slackIntegration ? slackWebhookUrl : undefined,
          teamToolsUrl: teamToolsUrl.trim() || undefined,
          customBranding: currentOrganization?.settings.customBranding,
        },
      })

      setCurrentOrganization(updated)
      toast({
        title: "Settings saved",
        description: "Your notification settings have been updated.",
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to save settings"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Personal Preferences - available to all users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Personal Reminder Settings
          </CardTitle>
          <CardDescription>Set your timezone and preferred EOD reminder time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="personalTimezone">Your Timezone</Label>
            <Select
              value={personalTimezone || "org-default"}
              onValueChange={(value) => setPersonalTimezone(value === "org-default" ? "" : value)}
              disabled={isSavingPersonal}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use organization default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org-default">Use organization default</SelectItem>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {personalTimezone
                ? `Reminders will be sent in ${personalTimezone}`
                : `Using organization timezone: ${currentOrganization?.settings.timezone || "America/New_York"}`}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personalReminderTime">Your EOD Reminder Time</Label>
            <Input
              id="personalReminderTime"
              type="time"
              value={personalReminderTime}
              onChange={(e) => setPersonalReminderTime(e.target.value)}
              disabled={isSavingPersonal}
              placeholder="HH:MM"
            />
            <p className="text-xs text-muted-foreground">
              {personalReminderTime
                ? `You'll receive reminders at ${personalReminderTime} in your timezone`
                : `Using organization default: ${currentOrganization?.settings.eodReminderTime || "17:00"}`}
            </p>
          </div>

          <Button onClick={handleSavePersonalPreferences} disabled={isSavingPersonal}>
            {isSavingPersonal ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Preferences
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Granular Notification Preferences */}
      {currentUser && (
        <NotificationPreferencesCard
          memberId={currentUser.id}
          initialPreferences={teamMembers.find((m) => m.id === currentUser.id)?.notificationPreferences}
        />
      )}

      {/* Browser Push Notifications */}
      {currentUser && <PushNotificationsCard userId={currentUser.id} />}

      {/* Personal Asana Integration for all members */}
      <AsanaMemberConnection />

      {/* Organization-level Email Notifications (Owner only) */}
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Configure email notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for important events
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
              disabled={!isOwner || isLoading}
            />
          </div>
          {isOwner && (
            <Button onClick={handleSaveOrganization} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Slack Integration (Owner only) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IntegrationLogo integration="slack" size="md" />
            Slack Integration
          </CardTitle>
          <CardDescription>Connect your Slack workspace to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Slack Notifications</Label>
              <p className="text-sm text-muted-foreground">Send notifications to a Slack channel</p>
            </div>
            <Switch
              checked={slackIntegration}
              onCheckedChange={setSlackIntegration}
              disabled={!isOwner || isLoading}
            />
          </div>
          {slackIntegration && (
            <div className="space-y-2">
              <Label htmlFor="slackWebhook">Slack Webhook URL</Label>
              <Input
                id="slackWebhook"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                disabled={!isOwner || isLoading}
              />
            </div>
          )}
          {isOwner && (
            <Button onClick={handleSaveOrganization} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Team Tools Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Team Tools
          </CardTitle>
          <CardDescription>
            Add an external link that all team members can access from the sidebar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teamToolsUrl">Team Tools URL</Label>
            <Input
              id="teamToolsUrl"
              type="url"
              placeholder="https://your-team-tools.example.com"
              value={teamToolsUrl}
              onChange={(e) => setTeamToolsUrl(e.target.value)}
              disabled={!isOwner || isLoading}
            />
            <p className="text-sm text-muted-foreground">
              When set, a "Team Tools" link will appear in the sidebar for all workspace members. Leave
              empty to hide this link.
            </p>
          </div>
          {isOwner && (
            <Button onClick={handleSaveOrganization} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
