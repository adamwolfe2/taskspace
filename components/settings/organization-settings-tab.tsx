"use client"

import React, { useState, useRef } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Check, Loader2, Upload, ImageIcon, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { api } from "@/lib/api/client"

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

export function OrganizationSettingsTab() {
  const { currentUser, currentOrganization, setCurrentOrganization } = useApp()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const isOwner = currentUser?.role === "owner"

  // Organization settings state
  const [orgName, setOrgName] = useState(currentOrganization?.name || "")
  const [timezone, setTimezone] = useState(currentOrganization?.settings.timezone || "America/New_York")
  const [eodReminderTime, setEodReminderTime] = useState(
    currentOrganization?.settings.eodReminderTime || "17:00"
  )
  const [orgLogo, setOrgLogo] = useState<string | undefined>(
    currentOrganization?.settings.customBranding?.logo
  )
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  // Handle logo file selection
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, etc.)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (max 500KB for base64)
    if (file.size > 500 * 1024) {
      toast({
        title: "File too large",
        description: "Logo must be less than 500KB",
        variant: "destructive",
      })
      return
    }

    setIsUploadingLogo(true)
    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setOrgLogo(base64)
        setIsUploadingLogo(false)
      }
      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        })
        setIsUploadingLogo(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setIsUploadingLogo(false)
    }
  }

  const handleRemoveLogo = () => {
    setOrgLogo(undefined)
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
  }

  const handleSaveOrganization = async () => {
    if (!isOwner) return

    try {
      setIsLoading(true)
      const updated = await api.organizations.update({
        name: orgName,
        settings: {
          ...currentOrganization?.settings,
          timezone,
          weekStartDay: currentOrganization?.settings.weekStartDay ?? 1,
          eodReminderTime,
          enableEmailNotifications: currentOrganization?.settings.enableEmailNotifications ?? true,
          enableSlackIntegration: currentOrganization?.settings.enableSlackIntegration ?? false,
          slackWebhookUrl: currentOrganization?.settings.slackWebhookUrl,
          teamToolsUrl: currentOrganization?.settings.teamToolsUrl,
          customBranding: {
            logo: orgLogo,
          },
        },
      })

      setCurrentOrganization(updated)
      toast({
        title: "Settings saved",
        description: "Your organization settings have been updated.",
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            Organization Details
          </CardTitle>
          <CardDescription>
            Basic information about your organization. These settings apply to all workspaces and team members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label>Organization Logo</Label>
            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              <div className="relative">
                {orgLogo ? (
                  <div className="relative">
                    <img
                      src={orgLogo}
                      alt="Organization logo"
                      className="w-20 h-20 rounded-lg object-cover border border-slate-200"
                    />
                    {isOwner && (
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        disabled={isLoading}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-slate-400" />
                  </div>
                )}
              </div>
              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                  disabled={!isOwner || isLoading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={!isOwner || isLoading || isUploadingLogo}
                  className="gap-2"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {orgLogo ? "Change Logo" : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: Square image, 200x200px or larger. Max 500KB.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!isOwner || isLoading}
              placeholder="e.g., Acme Corp"
            />
            <p className="text-xs text-muted-foreground">
              The name displayed across the platform for your organization.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Default Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone} disabled={!isOwner || isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used as the default for all team members. Individual members can override this in their personal settings.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eodTime">Default EOD Reminder Time</Label>
            <Input
              id="eodTime"
              type="time"
              value={eodReminderTime}
              onChange={(e) => setEodReminderTime(e.target.value)}
              disabled={!isOwner || isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Team members will receive a daily reminder to submit their end-of-day report at this time. Each member can set their own preferred time in Notifications settings.
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
