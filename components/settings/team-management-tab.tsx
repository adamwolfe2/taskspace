"use client"

import React, { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
import { Loader2, Mail, UserPlus, Copy, Trash2, AlertTriangle, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { api } from "@/lib/api/client"
import type { TeamMember, Invitation, SafeInvitation } from "@/lib/types"

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

export function TeamManagementTab() {
  const { currentUser, currentOrganization } = useApp()
  const { workspaces, currentWorkspace } = useWorkspaces()
  const { toast } = useToast()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<(SafeInvitation | Invitation)[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member")
  const [inviteDepartment, setInviteDepartment] = useState("General")
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState<string>(currentWorkspace?.id || "")
  const [isInviting, setIsInviting] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null)
  const [invitationToCancel, setInvitationToCancel] = useState<SafeInvitation | Invitation | null>(null)
  const [isCancellingInvitation, setIsCancellingInvitation] = useState(false)
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null)

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  // Update inviteWorkspaceId when currentWorkspace changes
  useEffect(() => {
    if (currentWorkspace?.id) {
      setInviteWorkspaceId(currentWorkspace.id)
    }
  }, [currentWorkspace])

  // Load team members and invitations
  useEffect(() => {
    const loadTeamData = async () => {
      try {
        const [members, invitations] = await Promise.all([
          api.members.list(),
          api.invitations.list().catch(() => []),
        ])
        setTeamMembers(members.map(m => ({
          ...m,
          joinDate: m.joinedAt,
          userId: m.userId ?? undefined,
        })))
        setPendingInvitations(invitations)
      } catch {
        /* silently ignore */
      }
    }
    loadTeamData()
  }, [])

  // Load integration status
  useEffect(() => {
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
    loadIntegrationStatus()
  }, [isAdmin])

  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      })
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteEmail.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
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
        workspaceId: inviteWorkspaceId || undefined,
      })

      setPendingInvitations([...pendingInvitations, invitation])
      setInviteEmail("")
      setShowInviteDialog(false)

      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${invitation.email}`,
      })

      // Copy invite link to clipboard
      if (typeof window !== "undefined") {
        const inviteLink = `${window.location.origin}?invite=${invitation.token}`
        try {
          await navigator.clipboard.writeText(inviteLink)
          toast({
            title: "Link copied",
            description: "Invitation link also copied to clipboard",
          })
        } catch {
          // Clipboard API not available
        }
      }
    } catch (err: unknown) {
      toast({
        title: "Failed to send invitation",
        description: getErrorMessage(err, "An error occurred"),
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const copyInviteLink = async (token: string) => {
    if (typeof window === "undefined") return
    const baseUrl = window.location.origin
    const inviteLink = `${baseUrl}?invite=${token}`
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast({
        title: "Link copied",
        description: "Invitation link copied to clipboard",
      })
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      })
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    setIsCancellingInvitation(true)
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })
      const data = await response.json().catch(() => ({ success: false, error: "Server error" }))

      if (!data.success) {
        throw new Error(data.error || "Failed to cancel invitation")
      }

      // Remove from local state
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId))
      setInvitationToCancel(null)

      toast({
        title: "Invitation cancelled",
        description: "The invitation has been revoked and the link is no longer valid.",
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to cancel invitation"),
        variant: "destructive",
      })
    } finally {
      setIsCancellingInvitation(false)
    }
  }

  const resendInvitation = async (invitationId: string) => {
    setResendingInvitationId(invitationId)
    try {
      const response = await fetch("/api/invitations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ id: invitationId }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to resend invitation")
      }

      if (data.data?.emailSent) {
        toast({
          title: "Invitation resent",
          description: "A new invitation email has been sent.",
        })
      } else {
        // Email failed — copy the link to clipboard
        const inviteLink = data.data?.inviteLink
        if (inviteLink) {
          await navigator.clipboard.writeText(inviteLink)
          toast({
            title: "Email failed — link copied",
            description: "The email couldn't be sent, but the invite link has been copied to your clipboard. Share it manually.",
          })
        }
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to resend invitation"),
        variant: "destructive",
      })
    } finally {
      setResendingInvitationId(null)
    }
  }

  const teamCount = teamMembers.length + pendingInvitations.length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Members</CardTitle>
          <CardDescription>Add new members to your organization</CardDescription>
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
                <DialogDescription>Send an invitation email to add a new team member</DialogDescription>
              </DialogHeader>
              {integrationStatus && !integrationStatus.email.configured && (
                <Alert className="border-amber-500 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Email not configured.</strong> Invitation emails won't be sent, but you can
                    still copy and share the invite link manually.
                    <a
                      href="#integrations"
                      className="underline ml-1"
                      onClick={() => setShowInviteDialog(false)}
                    >
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
                  <p className="text-xs text-muted-foreground">
                    They will receive an email with a link to join your organization.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Admins can manage settings, invite members, and configure workspaces. Members can view and contribute to their assigned workspaces.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    placeholder="e.g., Engineering, Marketing"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for organizing team members and filtering reports.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Workspace</Label>
                  <Select value={inviteWorkspaceId} onValueChange={setInviteWorkspaceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select workspace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((workspace) => (
                        <SelectItem key={workspace.id} value={workspace.id}>
                          {workspace.name}
                          {workspace.isDefault && " (Default)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Invitee will be added to this workspace upon accepting the invitation
                  </p>
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
                        onClick={() => resendInvitation(inv.id)}
                        disabled={resendingInvitationId === inv.id}
                        title="Resend invitation"
                      >
                        {resendingInvitationId === inv.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      {"token" in inv && inv.token && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(inv.token)}
                          title="Copy invite link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInvitationToCancel(inv)}
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
          <CardDescription>Your current plan's team member limits</CardDescription>
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
                {teamCount} / {currentOrganization?.subscription.maxUsers || 100}
              </p>
              <p className="text-sm text-muted-foreground">members</p>
            </div>
          </div>
          {teamCount >= (currentOrganization?.subscription.maxUsers || 100) && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You've reached your team member limit. Upgrade your plan to add more members.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the invitation sent to{" "}
              <strong>{invitationToCancel?.email}</strong>. The invite link will no longer be valid and they will not be able to join your organization with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancellingInvitation}>Keep Invitation</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invitationToCancel && cancelInvitation(invitationToCancel.id)}
              disabled={isCancellingInvitation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancellingInvitation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Invitation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
