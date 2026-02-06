"use client"

import { useState, useEffect } from "react"
import type { TeamMember, Rock, Invitation } from "@/lib/types"
import { api } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UserInitials } from "@/components/shared/user-initials"
import { RoleBadge } from "@/components/shared/role-badge"
import { formatDate } from "@/lib/utils/date-utils"
import { getErrorMessage } from "@/lib/utils"
import { Pencil, UserPlus, Settings, Mail, Trash2, Loader2, Clock, Copy, Users, CheckCircle2, XCircle, AlertCircle, Send, Target, KeyRound } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ManageRocksDialog } from "@/components/admin/manage-rocks-dialog"

interface AdminTeamPageProps {
  teamMembers: TeamMember[]
  setTeamMembers: (members: TeamMember[]) => void
  rocks: Rock[]
  setRocks: (rocks: Rock[]) => void
}

export function AdminTeamPage({ teamMembers, setTeamMembers, rocks, setRocks }: AdminTeamPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [rocksDialogOpen, setRocksDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingInvites, setIsLoadingInvites] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    department: "",
    role: "member" as "admin" | "member",
    managerId: null as string | null,
  })
  const [newMemberData, setNewMemberData] = useState({
    name: "",
    email: "",
    department: "General",
    role: "member" as "admin" | "member",
  })
  const [inviteData, setInviteData] = useState({
    email: "",
    department: "General",
    role: "member" as "admin" | "member",
  })
  const [bulkInviteDialogOpen, setBulkInviteDialogOpen] = useState(false)
  const [bulkInviteData, setBulkInviteData] = useState({
    emails: "",
    department: "General",
    role: "member" as "admin" | "member",
  })
  const [bulkInviteResult, setBulkInviteResult] = useState<{
    successful: Invitation[]
    failed: Array<{ email: string; error: string }>
  } | null>(null)
  const [metricData, setMetricData] = useState({ metricName: "", weeklyGoal: "" })
  const [isLoadingMetric, setIsLoadingMetric] = useState(false)
  const { toast } = useToast()

  // Load metric data when editing a member
  useEffect(() => {
    async function loadMetric() {
      if (!editingMember?.id) return
      setIsLoadingMetric(true)
      try {
        const response = await fetch(`/api/metrics?memberId=${editingMember.id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data.metric) {
            setMetricData({
              metricName: data.data.metric.metricName || "",
              weeklyGoal: String(data.data.metric.weeklyGoal || ""),
            })
          } else {
            setMetricData({ metricName: "", weeklyGoal: "" })
          }
        }
      } catch (err) {
        console.error("Failed to load metric:", err)
        setMetricData({ metricName: "", weeklyGoal: "" })
      } finally {
        setIsLoadingMetric(false)
      }
    }
    if (dialogOpen && editingMember) {
      loadMetric()
    }
  }, [dialogOpen, editingMember?.id])

  // Load invitations
  useEffect(() => {
    async function loadInvitations() {
      try {
        const data = await api.invitations.list()
        setInvitations(data)
      } catch (err) {
        // Ignore - user might not have permission
      } finally {
        setIsLoadingInvites(false)
      }
    }
    loadInvitations()
  }, [])

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member)
    setFormData({
      name: member.name,
      email: member.email,
      department: member.department,
      role: member.role === "owner" ? "admin" : member.role,
      managerId: member.managerId || null,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!editingMember) return

    try {
      setIsSubmitting(true)

      // Update member details - don't send role if editing an owner (role can't change)
      const updatePayload: { department: string; role?: "admin" | "member" } = {
        department: formData.department,
      }
      // Only include role if NOT an owner (owners can't have role changed)
      if (editingMember.role !== "owner") {
        updatePayload.role = formData.role
      }
      const updated = await api.members.update(editingMember.id, updatePayload)

      // Update manager assignment if changed
      if (formData.managerId !== editingMember.managerId) {
        await fetch("/api/manager/direct-reports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: editingMember.id,
            managerId: formData.managerId,
          }),
        })
      }

      // Update metric if provided
      if (metricData.metricName.trim() && metricData.weeklyGoal.trim()) {
        const goalNumber = parseInt(metricData.weeklyGoal, 10)
        if (!isNaN(goalNumber) && goalNumber >= 0) {
          const metricResponse = await fetch("/api/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberId: editingMember.id,
              metricName: metricData.metricName.trim(),
              weeklyGoal: goalNumber,
            }),
          })
          const metricResult = await metricResponse.json()
          if (!metricResult.success) {
            console.error("Failed to save metric:", metricResult.error)
            throw new Error(metricResult.error || "Failed to save weekly metric")
          }
        }
      }

      // Update local state with manager info, preserving existing TeamMember fields
      const updatedWithManager = {
        ...editingMember,
        ...updated,
        managerId: formData.managerId,
      }

      setTeamMembers(teamMembers.map((m) => (m.id === editingMember.id ? updatedWithManager as TeamMember : m)))
      toast({
        title: "Member Updated",
        description: `${formData.name} has been updated successfully`,
      })
      setDialogOpen(false)
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to update member"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteData.email) {
      toast({
        title: "Missing Email",
        description: "Please enter an email address",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const invitation = await api.invitations.create({
        email: inviteData.email,
        role: inviteData.role,
        department: inviteData.department,
      })
      setInvitations([...invitations, invitation])
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${inviteData.email}`,
      })
      setInviteDialogOpen(false)
      setInviteData({ email: "", department: "General", role: "member" })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to send invitation"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelInvite = async (invitationId: string) => {
    try {
      await api.invitations.cancel(invitationId)
      setInvitations(invitations.filter((i) => i.id !== invitationId))
      toast({
        title: "Invitation Cancelled",
        description: "The invitation has been cancelled",
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to cancel invitation"),
        variant: "destructive",
      })
    }
  }

  const copyInviteLink = (token: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    navigator.clipboard.writeText(`${baseUrl}?invite=${token}`)
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard",
    })
  }

  const handleBulkInvite = async () => {
    const emailList = bulkInviteData.emails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0)

    if (emailList.length === 0) {
      toast({
        title: "No Emails",
        description: "Please enter at least one email address",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      setBulkInviteResult(null)
      const result = await api.invitations.createBulk({
        emails: emailList,
        role: bulkInviteData.role,
        department: bulkInviteData.department,
      })

      setBulkInviteResult(result)

      if (result.successful.length > 0) {
        setInvitations([...invitations, ...result.successful])
        toast({
          title: "Invitations Sent",
          description: `Successfully sent ${result.successful.length} invitation(s)`,
        })
      }

      if (result.failed.length === 0) {
        // All successful, close dialog
        setBulkInviteDialogOpen(false)
        setBulkInviteData({ emails: "", department: "General", role: "member" })
        setBulkInviteResult(null)
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to send invitations"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending")

  // Create a draft team member (before invitation)
  const handleCreateDraftMember = async () => {
    if (!newMemberData.name || !newMemberData.email) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and email",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMemberData),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to create team member")
      }

      setTeamMembers([...teamMembers, data.data])
      toast({
        title: "Team Member Added",
        description: `${newMemberData.name} has been added. You can now assign rocks and tasks, then send an invitation when ready.`,
      })
      setAddMemberDialogOpen(false)
      setNewMemberData({ name: "", email: "", department: "General", role: "member" })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to create team member"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Send invitation to a pending member
  const handleSendInviteToPending = async (member: TeamMember) => {
    try {
      setIsSubmitting(true)
      const invitation = await api.invitations.create({
        email: member.email,
        role: member.role === "owner" ? "admin" : member.role,
        department: member.department,
      })
      setInvitations([...invitations, invitation])
      // Update member status in local state
      setTeamMembers(teamMembers.map(m =>
        m.id === member.id ? { ...m, status: "invited" } : m
      ))
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${member.email}`,
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to send invitation"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete a pending or invited member (who hasn't fully joined yet)
  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the workspace?`)) {
      return
    }

    try {
      const response = await fetch(`/api/members?memberId=${memberId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to remove member")
      }

      setTeamMembers(teamMembers.filter(m => m.id !== memberId))
      toast({
        title: "Member Removed",
        description: `${memberName} has been removed from the workspace`,
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to remove member"),
        variant: "destructive",
      })
    }
  }

  // Send a login link (password reset) to a team member
  const handleSendLoginLink = async (member: TeamMember) => {
    try {
      setIsSubmitting(true)
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to send login link")
      }

      toast({
        title: "Login Link Sent",
        description: `A password reset link has been sent to ${member.email}. They can use it to set a new password and log in.`,
      })
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(err, "Failed to send login link"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage team members and invite new users</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Add Team Member Dialog */}
          <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Create a team member first, assign rocks and tasks, then send an invitation when ready.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="memberName">Name</Label>
                  <Input
                    id="memberName"
                    value={newMemberData.name}
                    onChange={(e) => setNewMemberData({ ...newMemberData, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memberEmail">Email</Label>
                  <Input
                    id="memberEmail"
                    type="email"
                    value={newMemberData.email}
                    onChange={(e) => setNewMemberData({ ...newMemberData, email: e.target.value })}
                    placeholder="john@company.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="memberDept">Department</Label>
                    <Input
                      id="memberDept"
                      value={newMemberData.department}
                      onChange={(e) => setNewMemberData({ ...newMemberData, department: e.target.value })}
                      placeholder="Engineering"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="memberRole">Role</Label>
                    <Select
                      value={newMemberData.role}
                      onValueChange={(value: "admin" | "member") =>
                        setNewMemberData({ ...newMemberData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateDraftMember} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Team Member
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  After adding, you can assign rocks and tasks before sending an invitation.
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkInviteDialogOpen} onOpenChange={(open) => {
            setBulkInviteDialogOpen(open)
            if (!open) {
              setBulkInviteResult(null)
              setBulkInviteData({ emails: "", department: "General", role: "member" })
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Bulk Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Bulk Invite Team Members</DialogTitle>
                <DialogDescription>
                  Invite multiple team members at once. Enter one email per line or separate with commas.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="bulkEmails">Email Addresses</Label>
                  <Textarea
                    id="bulkEmails"
                    value={bulkInviteData.emails}
                    onChange={(e) => setBulkInviteData({ ...bulkInviteData, emails: e.target.value })}
                    placeholder="john@company.com&#10;jane@company.com&#10;bob@company.com"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter up to 50 email addresses, one per line or separated by commas
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulkDept">Department</Label>
                    <Input
                      id="bulkDept"
                      value={bulkInviteData.department}
                      onChange={(e) => setBulkInviteData({ ...bulkInviteData, department: e.target.value })}
                      placeholder="Engineering"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bulkRole">Role</Label>
                    <Select
                      value={bulkInviteData.role}
                      onValueChange={(value: "admin" | "member") =>
                        setBulkInviteData({ ...bulkInviteData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {bulkInviteResult && bulkInviteResult.failed.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      {bulkInviteResult.successful.length > 0 && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          {bulkInviteResult.successful.length} sent
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        {bulkInviteResult.failed.length} failed
                      </span>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-32 overflow-y-auto">
                      {bulkInviteResult.failed.map((f, i) => (
                        <div key={i} className="text-sm text-red-700 flex items-center gap-2">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium">{f.email}:</span>
                          <span>{f.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={handleBulkInvite} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitations...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Send Invitations
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Mail className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation email to add a new team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email Address</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                    placeholder="colleague@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteDept">Department</Label>
                  <Input
                    id="inviteDept"
                    value={inviteData.department}
                    onChange={(e) => setInviteData({ ...inviteData, department: e.target.value })}
                    placeholder="Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteRole">Role</Label>
                  <Select
                    value={inviteData.role}
                    onValueChange={(value: "admin" | "member") =>
                      setInviteData({ ...inviteData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
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
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="secondary" onClick={() => setRocksDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Manage Rocks
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Team Members ({teamMembers.length})</TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invitations
            {pendingInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingInvitations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>View and manage all team members including pending ones</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop: Table view */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserInitials name={member.name} size="sm" />
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{member.department}</TableCell>
                        <TableCell>
                          <RoleBadge role={member.role} />
                        </TableCell>
                        <TableCell>
                          {member.status === "pending" ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Not Invited
                            </Badge>
                          ) : member.status === "invited" ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Mail className="h-3 w-3 mr-1" />
                              Invited
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {member.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendInviteToPending(member)}
                                disabled={isSubmitting}
                                title="Send Invitation"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            )}
                            {member.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendLoginLink(member)}
                                disabled={isSubmitting}
                                title="Send Login Link"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(member)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {/* Allow removing non-owner members who aren't fully active, or active non-owners */}
                            {member.role !== "owner" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMember(member.id, member.name)}
                                title="Remove from workspace"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Card stack view */}
              <div className="sm:hidden space-y-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserInitials name={member.name} size="sm" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{member.name}</p>
                          <p className="text-xs text-gray-500 truncate">{member.email}</p>
                        </div>
                      </div>
                      {member.status === "pending" ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex-shrink-0 text-[10px]">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      ) : member.status === "invited" ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0 text-[10px]">
                          <Mail className="h-3 w-3 mr-1" />
                          Invited
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex-shrink-0 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Dept:</span>{" "}
                        <span className="text-gray-700">{member.department}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500">Role:</span>{" "}
                        <RoleBadge role={member.role} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      {member.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendInviteToPending(member)}
                          disabled={isSubmitting}
                          className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Send className="h-4 w-4 mr-1.5" />
                          Invite
                        </Button>
                      )}
                      {member.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendLoginLink(member)}
                          disabled={isSubmitting}
                          className="flex-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <KeyRound className="h-4 w-4 mr-1.5" />
                          Login Link
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(member)}
                        className="flex-1"
                      >
                        <Pencil className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>
                      {member.role !== "owner" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMember(member.id, member.name)}
                          className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>Manage outstanding team invitations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInvites ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingInvitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No pending invitations</p>
                  <p className="text-sm">Invite team members to get started</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingInvitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>{invitation.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>{invitation.department}</TableCell>
                        <TableCell>
                          <RoleBadge role={invitation.role} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(invitation.createdAt)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invitation.token)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvite(invitation.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Member Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Update team member information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDept">Department</Label>
              <Input
                id="editDept"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: "admin" | "member") =>
                  setFormData({ ...formData, role: value })
                }
                disabled={editingMember?.role === "owner"}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {editingMember?.role === "owner" && (
                <p className="text-xs text-muted-foreground">
                  Owner role cannot be changed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editManager">Reports To</Label>
              <Select
                value={formData.managerId || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, managerId: value === "none" ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {teamMembers
                    .filter((m) => m.id !== editingMember?.id && m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.department})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign a manager to enable team dashboard visibility
              </p>
            </div>

            {/* Weekly Metric Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-purple-600" />
                <Label className="font-semibold">Weekly Scorecard Metric</Label>
              </div>
              {isLoadingMetric ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading metric...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="metricName">Metric Name</Label>
                    <Input
                      id="metricName"
                      placeholder="e.g., Workflows, Sales Calls, Designs"
                      value={metricData.metricName}
                      onChange={(e) => setMetricData({ ...metricData, metricName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weeklyGoal">Weekly Goal</Label>
                    <Input
                      id="weeklyGoal"
                      type="number"
                      min="0"
                      placeholder="e.g., 5"
                      value={metricData.weeklyGoal}
                      onChange={(e) => setMetricData({ ...metricData, weeklyGoal: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This metric will appear in the EOD form and Weekly Scorecard
                  </p>
                </div>
              )}
            </div>

            <Button onClick={handleSubmit} className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Member"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ManageRocksDialog
        open={rocksDialogOpen}
        onOpenChange={setRocksDialogOpen}
        teamMembers={teamMembers}
        rocks={rocks}
        setRocks={setRocks}
      />
    </div>
  )
}
