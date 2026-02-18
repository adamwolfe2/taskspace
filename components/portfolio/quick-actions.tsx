"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCircle, Loader2, Mail, UserPlus } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface MissingEodMember {
  userId: string
  name: string
  email: string
}

interface QuickActionsProps {
  orgId: string
  orgName: string
  missingEodMembers: MissingEodMember[]
  openEscalationCount: number
  onRefresh: () => void
}

export function QuickActions({
  orgId,
  orgName,
  missingEodMembers,
  openEscalationCount,
  onRefresh,
}: QuickActionsProps) {
  const { toast } = useToast()
  const [nudging, setNudging] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteLoading, setInviteLoading] = useState(false)

  const handleNudgeMissingEods = async () => {
    if (missingEodMembers.length === 0) return

    setNudging(true)
    try {
      // Create notifications for each member who hasn't submitted
      const res = await fetch(`/api/notifications/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          organizationId: orgId,
          userIds: missingEodMembers.map((m) => m.userId),
          notification: {
            type: "eod_reminder",
            title: "EOD Report Reminder",
            message: `Please submit your End-of-Day report for today.`,
          },
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast({
          title: "Nudge sent",
          description: `Reminded ${missingEodMembers.length} team members to submit their EOD.`,
        })
      } else {
        // Fallback: show the list even if batch API doesn't exist yet
        toast({
          title: "Missing EODs",
          description: `${missingEodMembers.map((m) => m.name).join(", ")} haven't submitted today.`,
        })
      }
    } catch {
      toast({
        title: "Missing EODs",
        description: `${missingEodMembers.map((m) => m.name).join(", ")} haven't submitted today.`,
      })
    } finally {
      setNudging(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setInviteLoading(true)
    try {
      const res = await fetch(`/api/super-admin/orgs/${orgId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: "member",
          department: "General",
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast({ title: "Invitation sent", description: `Invited ${inviteEmail} to ${orgName}` })
        setInviteEmail("")
        setShowInvite(false)
        onRefresh()
      } else {
        toast({ title: "Error", description: json.error || "Failed to send invite", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Failed to send invite", variant: "destructive" })
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Nudge Missing EODs */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <div>
                  <div className="text-sm font-medium">Missing EODs</div>
                  <div className="text-xs text-slate-500">
                    {missingEodMembers.length === 0
                      ? "Everyone has submitted"
                      : `${missingEodMembers.length} member${missingEodMembers.length > 1 ? "s" : ""} haven't submitted`}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNudgeMissingEods}
                disabled={missingEodMembers.length === 0 || nudging}
              >
                {nudging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
                Nudge
              </Button>
            </div>

            {/* Escalation Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="text-sm font-medium">Escalations</div>
                  <div className="text-xs text-slate-500">
                    {openEscalationCount === 0 ? "None open" : `${openEscalationCount} open this week`}
                  </div>
                </div>
              </div>
              {openEscalationCount > 0 && (
                <Badge variant="destructive" className="text-xs">{openEscalationCount}</Badge>
              )}
            </div>

            {/* Invite Member */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">Invite Member</div>
                  <div className="text-xs text-slate-500">Add someone to this org</div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowInvite(true)}>
                <UserPlus className="h-3 w-3 mr-1" />
                Invite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite to {orgName}</DialogTitle>
            <DialogDescription>Send an invitation to join this organization.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@company.com"
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
