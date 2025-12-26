"use client"

import { useState, useEffect } from "react"
import type { TeamMember, Rock, Invitation } from "@/lib/types"
import { api } from "@/lib/api/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserInitials } from "@/components/shared/user-initials"
import { RoleBadge } from "@/components/shared/role-badge"
import { formatDate } from "@/lib/utils/date-utils"
import { Pencil, UserPlus, Settings, Mail, Trash2, Loader2, Clock, Copy } from "lucide-react"
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
  })
  const [inviteData, setInviteData] = useState({
    email: "",
    department: "General",
    role: "member" as "admin" | "member",
  })
  const { toast } = useToast()

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
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!editingMember) return

    try {
      setIsSubmitting(true)
      const updated = await api.members.update(editingMember.id, {
        department: formData.department,
        role: formData.role,
      })
      setTeamMembers(teamMembers.map((m) => (m.id === editingMember.id ? updated : m)))
      toast({
        title: "Member Updated",
        description: `${formData.name} has been updated successfully`,
      })
      setDialogOpen(false)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update member",
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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send invitation",
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
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to cancel invitation",
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

  const pendingInvitations = invitations.filter((i) => i.status === "pending")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">Manage team members and invite new users</p>
        </div>
        <div className="flex gap-2">
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
              <CardTitle>Active Team Members</CardTitle>
              <CardDescription>View and manage all team members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Join Date</TableHead>
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
                        <TableCell className="text-sm">{formatDate(member.joinDate)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(member)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
