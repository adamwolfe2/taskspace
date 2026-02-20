"use client"

import React, { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  Key,
  Loader2,
  Copy,
  ExternalLink,
  Trash2,
  Plus,
  Download,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  AlertTriangle,
} from "lucide-react"
import { IntegrationLogo } from "@/components/ui/integration-logo"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import type { TeamMember, ApiKey } from "@/lib/types"
import { AsanaIntegration } from "./asana-integration"
import { GoogleCalendarIntegration } from "./google-calendar-integration"
import { WebhookManagement } from "./webhook-management"

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

interface IntegrationsApiTabProps {
  teamMembers: TeamMember[]
}

export function IntegrationsApiTab({ teamMembers }: IntegrationsApiTabProps) {
  const { currentUser } = useApp()
  const { currentWorkspaceId } = useWorkspaces()
  const { toast } = useToast()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false)
  const [newApiKeyName, setNewApiKeyName] = useState("")
  const [newApiKeyExpiry, setNewApiKeyExpiry] = useState("")
  const [isCreatingKey, setIsCreatingKey] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [isRefreshingEmail, setIsRefreshingEmail] = useState(false)
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(
    null
  )
  const [apiKeyToDelete, setApiKeyToDelete] = useState<ApiKey | null>(null)
  const [isDeletingKey, setIsDeletingKey] = useState(false)

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  // Load API keys and integration status
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
      } catch {
        /* silently ignore */
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
      } catch {
        /* silently ignore */
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
          setIntegrationStatus((prev) =>
            prev
              ? {
                  ...prev,
                  email: {
                    configured: data.config.resendKeyValid,
                    provider: "Resend",
                    fromAddress: data.config.emailFrom || null,
                    appUrl: data.config.appUrl,
                    appUrlConfigured: data.config.appUrlConfigured,
                  },
                }
              : null
          )

          if (data.config.resendKeyValid) {
            toast({
              title: "Email configured",
              description: `Sending from: ${data.config.emailFrom}`,
            })
          } else {
            toast({
              title: "Email not configured",
              description: `API Key detected: ${data.config.resendKeySet ? "Yes" : "No"}, Valid format: ${data.config.resendKeyValid ? "Yes" : "No"}`,
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
    } catch {
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
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
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
      }
    } catch (err: unknown) {
      setTestEmailResult({
        success: false,
        message: getErrorMessage(err, "Network error"),
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
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          name: newApiKeyName.trim(),
          workspaceId: currentWorkspaceId || undefined,
          ...(newApiKeyExpiry ? { expiresAt: new Date(newApiKeyExpiry).toISOString() } : {}),
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to create API key")
      }

      // Store the full key to show to user (only shown once!)
      setNewlyCreatedKey(data.data.key)
      setApiKeys([...apiKeys, data.data])
      setNewApiKeyName("")
      setNewApiKeyExpiry("")

      toast({
        title: "API key created",
        description: "Make sure to copy your key - it won't be shown again!",
      })
    } catch (err: unknown) {
      toast({
        title: "Failed to create API key",
        description: getErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsCreatingKey(false)
    }
  }

  const handleDeleteApiKey = async (keyId: string) => {
    setIsDeletingKey(true)
    try {
      const response = await fetch(`/api/auth/api-key?id=${keyId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" }
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to delete API key")
      }

      setApiKeys(apiKeys.filter((k) => k.id !== keyId))
      setApiKeyToDelete(null)
      toast({
        title: "API key revoked",
        description: "The API key has been permanently deleted. Any integrations using this key will stop working.",
      })
    } catch (err: unknown) {
      toast({
        title: "Failed to delete API key",
        description: getErrorMessage(err),
        variant: "destructive",
      })
    } finally {
      setIsDeletingKey(false)
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

  return (
    <div className="space-y-4">
      {/* Email Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IntegrationLogo integration="resend" size="md" />
            Email Service (Invitations & Notifications)
          </CardTitle>
          <CardDescription>
            Required for sending team invitations and email notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrationStatus ? (
            <>
              <div
                className={`flex items-center gap-3 p-4 rounded-lg ${integrationStatus.email.configured ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                {integrationStatus.email.configured ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${integrationStatus.email.configured ? "text-green-800" : "text-red-800"}`}
                  >
                    {integrationStatus.email.configured ? "Email is configured" : "Email not configured"}
                  </p>
                  <p
                    className={`text-sm ${integrationStatus.email.configured ? "text-green-600" : "text-red-600"}`}
                  >
                    {integrationStatus.email.configured
                      ? `Provider: ${integrationStatus.email.provider} • From: ${integrationStatus.email.fromAddress}`
                      : "Team invitations will not be sent via email"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {integrationStatus.email.configured && <Badge className="bg-green-500">Active</Badge>}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshEmailStatus}
                    disabled={isRefreshingEmail}
                    aria-label="Refresh email status"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshingEmail ? "animate-spin" : ""}`} />
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
                      Email links are using <code className="bg-amber-100 px-1 rounded">localhost:3000</code>{" "}
                      instead of your production domain.
                    </p>
                    <p className="text-sm text-amber-700 mt-2">Add this environment variable in Vercel:</p>
                    <div className="mt-2 p-2 bg-white rounded border border-amber-300 font-mono text-xs">
                      NEXT_PUBLIC_APP_URL=https://trytaskspace.com
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      After adding the variable, redeploy your app for changes to take effect.
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
                  <Button onClick={sendTestEmail} disabled={isSendingTestEmail} className="gap-2">
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
                <div
                  className={`flex items-center gap-3 p-4 rounded-lg ${testEmailResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
                >
                  {testEmailResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <p
                    className={`text-sm ${testEmailResult.success ? "text-green-700" : "text-red-700"}`}
                  >
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
                      <li>
                        Sign up for a free{" "}
                        <a
                          href="https://resend.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline"
                        >
                          Resend
                        </a>{" "}
                        account
                      </li>
                      <li>Add and verify your domain (or use sandbox for testing)</li>
                      <li>Create an API key in Resend dashboard</li>
                      <li>Add these environment variables to your Vercel deployment:</li>
                    </ol>
                  </div>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono">
                      {`RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=Taskspace <noreply@yourdomain.com>`}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() =>
                        copyToClipboard(
                          `RESEND_API_KEY=re_your_api_key_here\nEMAIL_FROM=Taskspace <noreply@yourdomain.com>`,
                          "Environment variables"
                        )
                      }
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
              <Loader2 className="h-4 w-4 animate-spin" role="status" aria-label="Loading status" />
              Loading status...
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
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
            <Alert className="border-amber-500 bg-amber-50">
              <Key className="h-4 w-4 text-amber-600" />
              <AlertDescription className="space-y-2">
                <p className="font-medium text-amber-800">
                  Save your API key now - it won't be shown again!
                </p>
                <div className="flex items-center gap-2 p-2 bg-white rounded border font-mono text-sm">
                  <code className="flex-1 break-all">{newlyCreatedKey}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(newlyCreatedKey, "API key")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button size="sm" variant="outline" onClick={() => setNewlyCreatedKey(null)}>
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
                <DialogDescription>Create a new API key for external integrations</DialogDescription>
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
                  <p className="text-xs text-muted-foreground">A descriptive name to identify this key</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiKeyExpiry">Expiration Date (optional)</Label>
                  <Input
                    id="apiKeyExpiry"
                    type="date"
                    value={newApiKeyExpiry}
                    onChange={(e) => setNewApiKeyExpiry(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-muted-foreground">Leave blank for a key that never expires</p>
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
                {apiKeys.map((apiKey) => {
                  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
                  const isExpiringSoon = apiKey.expiresAt && !isExpired &&
                    new Date(apiKey.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
                  return (
                  <div key={apiKey.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{apiKey.name}</p>
                        {isExpired && <Badge variant="destructive" className="text-xs">Expired</Badge>}
                        {isExpiringSoon && <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">Expires soon</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">{maskApiKey(apiKey.key)}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(apiKey.createdAt).toLocaleDateString()}
                        {apiKey.lastUsedAt &&
                          ` • Last used ${new Date(apiKey.lastUsedAt).toLocaleDateString()}`}
                        {apiKey.expiresAt &&
                          ` • ${isExpired ? "Expired" : "Expires"} ${new Date(apiKey.expiresAt).toLocaleDateString()}`}
                        {!apiKey.expiresAt && " • Never expires"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setApiKeyToDelete(apiKey)}
                      aria-label="Revoke API key"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  )
                })}
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

      {/* MCP Server Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IntegrationLogo integration="claude" size="md" />
            Connect to Claude Desktop
          </CardTitle>
          <CardDescription>Use the MCP server to interact with your team from Claude Desktop</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* One-Click Setup */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Download className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900">One-Click Setup (Recommended)</h4>
                <p className="text-sm text-purple-700 mt-1">
                  Download a pre-configured extension and drag it into Claude Desktop's Extensions settings.
                </p>
                {apiKeys.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <Label className="text-sm text-purple-800">Select an API key to include:</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {apiKeys.map((key) => (
                        <Button
                          key={key.id}
                          size="sm"
                          className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                          onClick={() => {
                            window.open(`/api/mcp/bundle?keyId=${key.id}`, "_blank")
                            toast({
                              title: "Downloading extension...",
                              description: "Drag the .mcpb file into Claude Desktop → Settings → Extensions",
                            })
                          }}
                        >
                          <Download className="h-4 w-4" />
                          {key.name}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-purple-600 mt-2">
                      After downloading, open Claude Desktop → Settings → Extensions, then drag and drop the
                      file.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-sm text-amber-700">
                      Create an API key above first, then come back here to download the extension.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground">
            For manual setup instructions, see the MCP Server documentation.
          </div>
        </CardContent>
      </Card>

      {/* Webhook Management */}
      <WebhookManagement />

      {/* Asana Integration */}
      <AsanaIntegration teamMembers={teamMembers} />

      {/* Google Calendar Integration */}
      {currentUser && <GoogleCalendarIntegration userId={currentUser.id} />}

      {/* Delete API Key Confirmation */}
      <AlertDialog open={!!apiKeyToDelete} onOpenChange={() => setApiKeyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke API Key?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the API key{" "}
              <strong>"{apiKeyToDelete?.name}"</strong>. Any integrations or applications using this key
              (including Claude Desktop MCP connections) will immediately lose access and stop working.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingKey}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => apiKeyToDelete && handleDeleteApiKey(apiKeyToDelete.id)}
              disabled={isDeletingKey}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingKey ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Revoking...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revoke Key
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
