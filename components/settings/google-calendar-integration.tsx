"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react"
import { IntegrationLogo } from "@/components/ui/integration-logo"

interface GoogleCalendarIntegrationProps {
  userId: string
}

interface CalendarStatus {
  isConfigured: boolean
  isConnected: boolean
  syncEnabled: boolean
  calendarId: string | null
  lastSyncAt: string | null
  calendars: Array<{ id: string; summary: string; primary?: boolean }>
  authUrl: string | null
}

export function GoogleCalendarIntegration({ userId }: GoogleCalendarIntegrationProps) {
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadStatus()

    // Check for redirect params
    const params = new URLSearchParams(window.location.search)
    if (params.get("calendar_connected") === "true") {
      toast({
        title: "Connected!",
        description: "Google Calendar is now connected",
      })
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
    } else if (params.get("calendar_error")) {
      toast({
        title: "Connection failed",
        description: "Failed to connect Google Calendar. Please try again.",
        variant: "destructive",
      })
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  const loadStatus = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/google-calendar")
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStatus(data.data)
        }
      }
    } catch (_error) {
      /* silently ignore */
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = () => {
    if (status?.authUrl) {
      window.location.href = status.authUrl
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      const response = await fetch("/api/google-calendar", {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      })
      if (response.ok) {
        toast({
          title: "Disconnected",
          description: "Google Calendar has been disconnected",
        })
        loadStatus()
      } else {
        throw new Error("Failed to disconnect")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar",
        variant: "destructive",
      })
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleUpdateSettings = async (updates: { syncEnabled?: boolean; calendarId?: string }) => {
    setIsUpdating(true)
    try {
      const response = await fetch("/api/google-calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        toast({
          title: "Settings updated",
          description: "Your Google Calendar settings have been saved",
        })
        loadStatus()
      } else {
        throw new Error("Failed to update settings")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IntegrationLogo integration="google-calendar" size="md" />
            Google Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status?.isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IntegrationLogo integration="google-calendar" size="md" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Sync your tasks and rocks to Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Not configured</p>
              <p className="text-sm text-amber-700 mt-1">
                Google Calendar integration requires server configuration.
              </p>
              <p className="text-xs text-amber-600 mt-2">
                Set <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_ID</code> and{" "}
                <code className="bg-amber-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> environment variables.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IntegrationLogo integration="google-calendar" size="md" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Sync your tasks and rocks to Google Calendar
            </CardDescription>
          </div>
          {status.isConnected && (
            <Badge className="bg-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status.isConnected ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center">
              <IntegrationLogo integration="google-calendar" size="xl" />
            </div>
            <div className="text-center">
              <p className="font-medium">Connect Google Calendar</p>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically sync your tasks and rocks as calendar events
              </p>
            </div>
            <Button onClick={handleConnect} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Connect with Google
            </Button>
          </div>
        ) : (
          <>
            {/* Sync toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div>
                <Label className="font-medium">Automatic Sync</Label>
                <p className="text-sm text-muted-foreground">
                  Sync tasks and rocks to your calendar automatically
                </p>
              </div>
              <Switch
                checked={status.syncEnabled}
                onCheckedChange={(checked) => handleUpdateSettings({ syncEnabled: checked })}
                disabled={isUpdating}
              />
            </div>

            {/* Calendar selection */}
            {status.calendars.length > 0 && (
              <div className="space-y-2">
                <Label>Sync to Calendar</Label>
                <Select
                  value={status.calendarId || "primary"}
                  onValueChange={(value) => handleUpdateSettings({ calendarId: value })}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {status.calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.summary} {cal.primary && "(Primary)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Last sync info */}
            {status.lastSyncAt && (
              <p className="text-xs text-muted-foreground">
                Last synced: {new Date(status.lastSyncAt).toLocaleString()}
              </p>
            )}

            {/* Disconnect button */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Disconnect Google Calendar
              </Button>
            </div>
          </>
        )}

        <div className="text-xs text-muted-foreground pt-2">
          <p>When sync is enabled:</p>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>Tasks with due dates create calendar events</li>
            <li>Rocks create events on their due dates</li>
            <li>Status changes update event colors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
