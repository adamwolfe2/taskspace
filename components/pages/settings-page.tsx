"use client"

import React, { useState, useEffect, useRef } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { api } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  Building,
  Bell,
  Users,
  CreditCard,
  Shield,
  Check,
  Loader2,
  Copy,
  ExternalLink,
  Mail,
  UserPlus,
  Key,
  Trash2,
  Plus,
  Terminal,
  Download,
  FileSpreadsheet,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Upload,
  ImageIcon,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { TeamMember, Invitation, ApiKey } from "@/lib/types"

interface IntegrationStatus {
  email: {
    configured: boolean
    provider: string
    fromAddress: string | null
    appUrl?: string
    appUrlConfigured?: boolean
  }
  slack: {
    configured: boolean
    webhookSet: boolean
  }
  ai: {
    configured: boolean
    provider: string
  }
}

export function SettingsPage() {
  const { currentUser, currentOrganization, setCurrentOrganization } = useApp()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member")
  const [inviteDepartment, setInviteDepartment] = useState("General")
  const [isInviting, setIsInviting] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState("")
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)

  // Integration status
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [isRefreshingEmail, setIsRefreshingEmail] = useState(false)
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null)

  // Role checks (defined early for use in effects)
  const isOwner = currentUser?.role === "owner"
  const isAdmin = currentUser?.role === "admin" || isOwner

  // Load team members, invitations, and API keys
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const [members, invitations] = await Promise.all([
          api.members.list(),
          api.invitations.list().catch(() => []), // May fail for non-admins
        ])
        setTeamMembers(members)
        setPendingInvitations(invitations)
      } catch (err) {
        console.error("Failed to load team data:", err)
      }
    }
    loadTeamData()
  }, [])

  // Load API keys and integration status (admin only)
  useEffect(() => {
    const loadApiKeys = async () => {
      if (!isAdmin) return
      try {
        const response = await fetch("/api/auth/api-key")
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setApiKeys(data.data || [])
          }
        }
      } catch (err) {
        console.error("Failed to load API keys:", err)
      }
    }

    const loadIntegrationStatus = async () => {
      if (!isAdmin) return
      try {
        const response = await fetch("/api/integrations/status")
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setIntegrationStatus(data.data)
          }
        }
      } catch (err) {
        console.error("Failed to load integration status:", err)
      }
    }

    loadApiKeys()
    loadIntegrationStatus()
  }, [isAdmin])

  // Refresh email integration status
  const refreshEmailStatus = async () => {
    setIsRefreshingEmail(true)
    setTestEmailResult(null)
    try {
      const response = await fetch("/api/test-email")
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.config) {
          setIntegrationStatus(prev => prev ? {
            ...prev,
            email: {
              configured: data.config.resendKeyValid,
              provider: "Resend",
              fromAddress: data.config.emailFrom || null,
              appUrl: data.config.appUrl,
              appUrlConfigured: data.config.appUrlConfigured,
            }
          } : null)

          if (data.config.resendKeyValid) {
            toast({
              title: "Email configured",
              description: `Sending from: ${data.config.emailFrom}`,
            })
          } else {
            toast({
              title: "Email not configured",
              description: `API Key detected: ${data.config.resendKeySet ? 'Yes' : 'No'}, Valid format: ${data.config.resendKeyValid ? 'Yes' : 'No'}`,
              variant: "destructive",
            })
          }
        }
      } else {
        // Fallback to integrations status endpoint
        const statusResponse = await fetch("/api/integrations/status")
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          if (statusData.success) {
            setIntegrationStatus(statusData.data)
          }
        }
      }
    } catch (err) {
      console.error("Failed to refresh email status:", err)
      toast({
        title: "Error",
        description: "Failed to check email configuration",
        variant: "destructive",
      })
    } finally {
      setIsRefreshingEmail(false)
    }
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!currentUser?.email) return

    setIsSendingTestEmail(true)
    setTestEmailResult(null)
    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail: currentUser.email }),
      })
      const data = await response.json()

      if (data.success) {
        setTestEmailResult({
          success: true,
          message: `Test email sent to ${currentUser.email}`,
        })
        toast({
          title: "Test email sent",
          description: `Check your inbox at ${currentUser.email}`,
        })
      } else {
        setTestEmailResult({
          success: false,
          message: data.error || data.resendError?.message || "Failed to send test email",
        })
        toast({
          title: "Failed to send test email",
          description: data.error || "Check the debug info below",
          variant: "destructive",
        })
        // Log debug info
        console.log("Email debug info:", data.debug)
      }
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        message: err.message || "Network error",
      })
      toast({
        title: "Error",
        description: "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setIsSendingTestEmail(false)
    }
  }

  const teamCount = teamMembers.length + pendingInvitations.length

  // Organization settings state
  const [orgName, setOrgName] = useState(currentOrganization?.name || "")
  const [timezone, setTimezone] = useState(currentOrganization?.settings.timezone || "America/New_York")
  const [eodReminderTime, setEodReminderTime] = useState(
    currentOrganization?.settings.eodReminderTime || "17:00"
  )
  const [emailNotifications, setEmailNotifications] = useState(
    currentOrganization?.settings.enableEmailNotifications ?? true
  )
  const [slackIntegration, setSlackIntegration] = useState(
    currentOrganization?.settings.enableSlackIntegration ?? false
  )
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(
    currentOrganization?.settings.slackWebhookUrl || ""
  )
  const [orgLogo, setOrgLogo] = useState<string | undefined>(
    currentOrganization?.settings.customBranding?.logo
  )
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

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
          timezone,
          eodReminderTime,
          enableEmailNotifications: emailNotifications,
          enableSlackIntegration: slackIntegration,
          slackWebhookUrl: slackIntegration ? slackWebhookUrl : undefined,
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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      })
      return
    }

    try {
      setIsInviting(true)
      const invitation = await api.invitations.create({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        department: inviteDepartment,
      })

      setPendingInvitations([...pendingInvitations, invitation])
      setInviteEmail("")
      setShowInviteDialog(false)

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${invitation.email}`,
      })

      // Copy invite link to clipboard
      const inviteLink = `${window.location.origin}?invite=${invitation.token}`
      await navigator.clipboard.writeText(inviteLink)
      toast({
        title: "Link copied",
        description: "Invitation link also copied to clipboard",
      })
    } catch (err: any) {
      toast({
        title: "Failed to send invitation",
        description: err.message || "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const copyInviteLink = async (token: string) => {
    const baseUrl = window.location.origin
    const inviteLink = `${baseUrl}?invite=${token}`
    await navigator.clipboard.writeText(inviteLink)
    toast({
      title: "Link copied",
      description: "Invitation link copied to clipboard",
    })
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to cancel invitation")
      }

      // Remove from local state
      setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId))

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been removed",
      })
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel invitation",
        variant: "destructive",
      })
    }
  }

  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for the API key",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreatingKey(true)
      const response = await fetch("/api/auth/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newApiKeyName.trim() }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to create API key")
      }

      // Store the full key to show to user (only shown once!)
      setNewlyCreatedKey(data.data.key)
      setApiKeys([...apiKeys, data.data])
      setNewApiKeyName("")

      toast({
        title: "API key created",
        description: "Make sure to copy your key - it won't be shown again!",
      })
    } catch (err: any) {
      toast({
        title: "Failed to create API key",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setIsCreatingKey(false)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/auth/api-key?id=${keyId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to delete API key")
      }

      setApiKeys(apiKeys.filter(k => k.id !== keyId))
      toast({
        title: "API key deleted",
        description: "The API key has been revoked",
      })
    } catch (err: any) {
      toast({
        title: "Failed to delete API key",
        description: err.message,
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    })
  }

  const maskApiKey = (key: string) => {
    if (key.length <= 12) return key
    return key.substring(0, 8) + "..." + key.substring(key.length - 4)
  }

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return <Badge variant="secondary">Free</Badge>
      case "starter":
        return <Badge className="bg-blue-500">Starter</Badge>
      case "professional":
        return <Badge className="bg-purple-500">Professional</Badge>
      case "enterprise":
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-500">Enterprise</Badge>
      default:
        return <Badge variant="secondary">{plan}</Badge>
    }
  }

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization settings and preferences
        </p>
      </div>

      <Tabs defaultValue="organization" className="space-y-6">
        <TabsList>
          <TabsTrigger value="organization" className="gap-2">
            <Building className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="integrations" className="gap-2">
              <Key className="h-4 w-4" />
              Integrations
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="data" className="gap-2">
              <Download className="h-4 w-4" />
              Data Export
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Basic information about your organization
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select
                  value={timezone}
                  onValueChange={setTimezone}
                  disabled={!isOwner || isLoading}
                >
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="eodTime">EOD Reminder Time</Label>
                <Input
                  id="eodTime"
                  type="time"
                  value={eodReminderTime}
                  onChange={(e) => setEodReminderTime(e.target.value)}
                  disabled={!isOwner || isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Team members will receive a reminder to submit their EOD at this time
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
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email notification preferences
              </CardDescription>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Slack Integration</CardTitle>
              <CardDescription>
                Connect your Slack workspace to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Slack Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Send notifications to a Slack channel
                  </p>
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
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invite Team Members</CardTitle>
                <CardDescription>
                  Add new members to your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <UserPlus className="h-4 w-4" />
                      Send Invitation
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation email to add a new team member
                      </DialogDescription>
                    </DialogHeader>
                    {integrationStatus && !integrationStatus.email.configured && (
                      <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-200">
                          <strong>Email not configured.</strong> Invitation emails won't be sent, but you can still copy and share the invite link manually.
                          <a href="#integrations" className="underline ml-1" onClick={() => setShowInviteDialog(false)}>
                            Set up email →
                          </a>
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">Email Address</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="colleague@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "member" | "admin")}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">Team Member</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Input
                          placeholder="e.g., Engineering, Marketing"
                          value={inviteDepartment}
                          onChange={(e) => setInviteDepartment(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSendInvite} disabled={isInviting}>
                        {isInviting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Invitation
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {pendingInvitations.length > 0 && (
                  <div className="space-y-2">
                    <Label>Pending Invitations</Label>
                    <div className="space-y-2">
                      {pendingInvitations.map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{inv.email}</p>
                            <p className="text-sm text-muted-foreground">
                              {inv.role} • {inv.department}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyInviteLink(inv.token)}
                              title="Copy invite link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cancelInvitation(inv.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Cancel invitation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Limits</CardTitle>
                <CardDescription>
                  Your current plan's team member limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">Team Members</p>
                    <p className="text-sm text-muted-foreground">
                      {teamMembers.length} active + {pendingInvitations.length} pending
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {teamCount} / {currentOrganization?.subscription.maxUsers || 5}
                    </p>
                    <p className="text-sm text-muted-foreground">members</p>
                  </div>
                </div>
                {teamCount >= (currentOrganization?.subscription.maxUsers || 5) && (
                  <Alert className="mt-4">
                    <AlertDescription>
                      You've reached your team member limit. Upgrade your plan to add more members.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>
                  Your organization's subscription details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getPlanBadge(currentOrganization?.subscription.plan || "free")}
                      <span className="font-medium capitalize">
                        {currentOrganization?.subscription.plan || "Free"} Plan
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentOrganization?.subscription.maxUsers || 5} team members included
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground" />
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Plan Features</h4>
                  <ul className="space-y-2">
                    {(currentOrganization?.subscription.features || [
                      "basic_rocks",
                      "basic_tasks",
                      "eod_reports",
                    ]).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        {feature.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Upgrade Your Plan</h4>
                  <p className="text-sm text-muted-foreground">
                    Get more features and team member slots with a paid plan.
                  </p>
                  <Button className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    View Pricing
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>
                  View your past invoices and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No billing history available</p>
                  <p className="text-sm">
                    Upgrade to a paid plan to see your invoices here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="integrations" className="space-y-6">
            {/* Email Configuration Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Service (Invitations & Notifications)
                </CardTitle>
                <CardDescription>
                  Required for sending team invitations and email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {integrationStatus ? (
                  <>
                    <div className={`flex items-center gap-3 p-4 rounded-lg ${integrationStatus.email.configured ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800'}`}>
                      {integrationStatus.email.configured ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${integrationStatus.email.configured ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                          {integrationStatus.email.configured ? 'Email is configured' : 'Email not configured'}
                        </p>
                        <p className={`text-sm ${integrationStatus.email.configured ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {integrationStatus.email.configured
                            ? `Provider: ${integrationStatus.email.provider} • From: ${integrationStatus.email.fromAddress}`
                            : 'Team invitations will not be sent via email'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {integrationStatus.email.configured && (
                          <Badge className="bg-green-500">Active</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={refreshEmailStatus}
                          disabled={isRefreshingEmail}
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefreshingEmail ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {/* APP URL Warning */}
                    {integrationStatus.email.configured && integrationStatus.email.appUrlConfigured === false && (
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-800">App URL Not Configured</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Email links are using <code className="bg-amber-100 px-1 rounded">localhost:3000</code> instead of your production domain.
                          </p>
                          <p className="text-sm text-amber-700 mt-2">
                            Add this environment variable in Vercel:
                          </p>
                          <div className="mt-2 p-2 bg-white rounded border border-amber-300 font-mono text-xs">
                            NEXT_PUBLIC_APP_URL=https://eod.aimanagingservices.com
                          </div>
                          <p className="text-xs text-amber-600 mt-2">
                            After adding the variable, redeploy your app for changes to take effect.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* APP URL Configured */}
                    {integrationStatus.email.configured && integrationStatus.email.appUrlConfigured === true && (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-700">App URL Configured</p>
                          <p className="text-sm text-slate-500">
                            Links in emails will use: <code className="bg-slate-100 px-1 rounded">{integrationStatus.email.appUrl}</code>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Test Email Section */}
                    {integrationStatus.email.configured && (
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
                        <div className="flex-1">
                          <p className="font-medium text-slate-700">Send Test Email</p>
                          <p className="text-sm text-slate-500">
                            Send a test email to {currentUser?.email} to verify everything is working
                          </p>
                        </div>
                        <Button
                          onClick={sendTestEmail}
                          disabled={isSendingTestEmail}
                          className="gap-2"
                        >
                          {isSendingTestEmail ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          Send Test
                        </Button>
                      </div>
                    )}

                    {/* Test Result */}
                    {testEmailResult && (
                      <div className={`flex items-center gap-3 p-4 rounded-lg ${testEmailResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {testEmailResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <p className={`text-sm ${testEmailResult.success ? 'text-green-700' : 'text-red-700'}`}>
                          {testEmailResult.message}
                        </p>
                      </div>
                    )}

                    {!integrationStatus.email.configured && (
                      <div className="space-y-4">
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Setup Instructions</h4>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                            <li>Sign up for a free <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Resend</a> account</li>
                            <li>Add and verify your domain (or use sandbox for testing)</li>
                            <li>Create an API key in Resend dashboard</li>
                            <li>Add these environment variables to your Vercel deployment:</li>
                          </ol>
                        </div>
                        <div className="relative">
                          <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
{`RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=AIMS Dashboard <noreply@yourdomain.com>`}
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => copyToClipboard(`RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=AIMS Dashboard <noreply@yourdomain.com>`, "Environment variables")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="outline" className="gap-2" asChild>
                          <a href="https://resend.com/docs/introduction" target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                            View Resend Documentation
                          </a>
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading status...
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Create API keys to connect external tools like Claude Desktop via MCP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Newly created key warning */}
                {newlyCreatedKey && (
                  <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                    <Key className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="space-y-2">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        Save your API key now - it won't be shown again!
                      </p>
                      <div className="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border font-mono text-sm">
                        <code className="flex-1 break-all">{newlyCreatedKey}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(newlyCreatedKey, "API key")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setNewlyCreatedKey(null)}
                      >
                        I've saved my key
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Create new key */}
                <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create API Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create API Key</DialogTitle>
                      <DialogDescription>
                        Create a new API key for external integrations
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="apiKeyName">Key Name</Label>
                        <Input
                          id="apiKeyName"
                          placeholder="e.g., Claude Desktop, MCP Server"
                          value={newApiKeyName}
                          onChange={(e) => setNewApiKeyName(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          A descriptive name to identify this key
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateApiKey} disabled={isCreatingKey}>
                        {isCreatingKey ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4" />
                            Create Key
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Existing keys */}
                {apiKeys.length > 0 && (
                  <div className="space-y-2">
                    <Label>Your API Keys</Label>
                    <div className="space-y-2">
                      {apiKeys.map((apiKey) => (
                        <div key={apiKey.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{apiKey.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {maskApiKey(apiKey.key)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Created {new Date(apiKey.createdAt).toLocaleDateString()}
                              {apiKey.lastUsedAt && ` • Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteApiKey(apiKey.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {apiKeys.length === 0 && !newlyCreatedKey && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No API keys created yet</p>
                    <p className="text-sm">Create one to connect Claude Desktop</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Connect to Claude Desktop
                </CardTitle>
                <CardDescription>
                  Use the MCP server to interact with AIMS from Claude Desktop
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Setup Instructions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Create an API key above (if you haven't already)</li>
                    <li>Download the MCP server from your deployment</li>
                    <li>Open Claude Desktop settings</li>
                    <li>Add the MCP server configuration below</li>
                  </ol>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Claude Desktop Configuration</Label>
                  <p className="text-xs text-muted-foreground">
                    Add this to your Claude Desktop config file (~/.claude/claude_desktop_config.json)
                  </p>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
{`{
  "mcpServers": {
    "aims": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-server/src/index.ts"],
      "env": {
        "AIMS_API_URL": "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}",
        "AIMS_API_KEY": "your-api-key-here"
      }
    }
  }
}`}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(`{
  "mcpServers": {
    "aims": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-server/src/index.ts"],
      "env": {
        "AIMS_API_URL": "${typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}",
        "AIMS_API_KEY": "your-api-key-here"
      }
    }
  }
}`, "Configuration")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Available MCP Tools</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Once connected, you can use these commands in Claude:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="p-2 bg-muted rounded">
                      <code className="text-xs font-mono">get_team_members</code>
                      <p className="text-xs text-muted-foreground">List all team members</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <code className="text-xs font-mono">check_eod_status</code>
                      <p className="text-xs text-muted-foreground">See who submitted EOD</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <code className="text-xs font-mono">assign_task</code>
                      <p className="text-xs text-muted-foreground">Assign tasks to team</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <code className="text-xs font-mono">get_daily_digest</code>
                      <p className="text-xs text-muted-foreground">Get AI summary</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <code className="text-xs font-mono">get_blockers</code>
                      <p className="text-xs text-muted-foreground">View all blockers</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <code className="text-xs font-mono">send_eod_reminder</code>
                      <p className="text-xs text-muted-foreground">Remind missing members</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Data Export Tab */}
        {isAdmin && (
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Export Data</CardTitle>
                <CardDescription>
                  Download your organization's data in CSV or JSON format
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Rocks Export */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Rocks (Goals)</h3>
                        <p className="text-sm text-muted-foreground">Export all quarterly goals</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=rocks&format=csv", "_blank")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=rocks&format=json", "_blank")}
                      >
                        <FileJson className="h-4 w-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                  </div>

                  {/* Tasks Export */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Tasks</h3>
                        <p className="text-sm text-muted-foreground">Export all assigned tasks</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=tasks&format=csv", "_blank")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=tasks&format=json", "_blank")}
                      >
                        <FileJson className="h-4 w-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                  </div>

                  {/* EOD Reports Export */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <FileSpreadsheet className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">EOD Reports</h3>
                        <p className="text-sm text-muted-foreground">Export all end-of-day reports</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=eod-reports&format=csv", "_blank")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=eod-reports&format=json", "_blank")}
                      >
                        <FileJson className="h-4 w-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                  </div>

                  {/* Team Export */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">Team Members</h3>
                        <p className="text-sm text-muted-foreground">Export team directory</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=team&format=csv", "_blank")}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open("/api/export?type=team&format=json", "_blank")}
                      >
                        <FileJson className="h-4 w-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Export Notes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>CSV files can be opened in Excel, Google Sheets, or any spreadsheet application</li>
                    <li>JSON format is useful for data migration or integration with other systems</li>
                    <li>Large exports may take a moment to generate</li>
                    <li>Exports include all historical data - use date filters in API for specific ranges</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
