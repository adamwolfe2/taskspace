"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Users, UserPlus, Loader2, Trash2, Shield, Eye, Crown, Settings2, BarChart3, AlertTriangle, Briefcase, Building2, Folder, Save } from "lucide-react"
import { useWorkspaces, useWorkspaceDetails, useUpdateWorkspace, useDeleteWorkspace } from "@/lib/hooks/use-workspace"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { TeamMember } from "@/lib/types"
import type { Workspace } from "@/lib/hooks/use-workspace"
import { WorkspaceBrandingSettings } from "./workspace-branding-settings"

interface WorkspaceSettingsTabProps {
  teamMembers: TeamMember[]
}

export function WorkspaceSettingsTab({ teamMembers }: WorkspaceSettingsTabProps) {
  const { currentWorkspace, isAdmin, refresh: refreshWorkspaces } = useWorkspaces()
  const { details, isLoading, refresh } = useWorkspaceDetails(currentWorkspace?.id || null)
  const { updateWorkspace } = useUpdateWorkspace()
  const { deleteWorkspace } = useDeleteWorkspace()
  const { toast } = useToast()

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({})

  // Workspace editing state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name || "")
  const [workspaceType, setWorkspaceType] = useState<Workspace["type"]>(currentWorkspace?.type || "team")
  const [workspaceDescription, setWorkspaceDescription] = useState(currentWorkspace?.description || "")

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  // Update local state when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name)
      setWorkspaceType(currentWorkspace.type)
      setWorkspaceDescription(currentWorkspace.description || "")
    }
  }, [currentWorkspace])

  if (!currentWorkspace) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No workspace selected</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const workspaceMembers = details?.members || []
  const availableToAdd = teamMembers.filter(
    (tm) => !workspaceMembers.some((wm) => wm.userId === tm.id)
  )

  const handleAddMember = async (userId: string, role: string = "member") => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to add member")
      }

      toast({
        title: "Member added",
        description: "Team member has been added to the workspace",
      })

      await refresh()
    } catch (error) {
      console.error("Failed to add member:", error)
      toast({
        title: "Failed to add member",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setIsRemoving(true)
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members/${userId}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to remove member")
      }

      toast({
        title: "Member removed",
        description: "Team member has been removed from the workspace",
      })

      await refresh()
      setMemberToRemove(null)
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast({
        title: "Failed to remove member",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || "Failed to update role")
      }

      toast({
        title: "Role updated",
        description: "Member role has been updated successfully",
      })

      await refresh()
      setRoleChanges({})
    } catch (error) {
      console.error("Failed to update role:", error)
      toast({
        title: "Failed to update role",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3" />
      case "admin":
        return <Shield className="h-3 w-3" />
      case "viewer":
        return <Eye className="h-3 w-3" />
      default:
        return <Users className="h-3 w-3" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "admin":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "viewer":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-green-100 text-green-800 border-green-200"
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSaveWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast({
        title: "Validation error",
        description: "Workspace name is required",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      await updateWorkspace(currentWorkspace.id, {
        name: workspaceName.trim(),
        type: workspaceType,
        description: workspaceDescription.trim() || undefined,
      })

      toast({
        title: "Workspace updated",
        description: "Your changes have been saved successfully",
      })

      setIsEditing(false)
      await refresh()
      await refreshWorkspaces()
    } catch (error) {
      console.error("Failed to update workspace:", error)
      toast({
        title: "Failed to update workspace",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setWorkspaceName(currentWorkspace?.name || "")
    setWorkspaceType(currentWorkspace?.type || "team")
    setWorkspaceDescription(currentWorkspace?.description || "")
    setIsEditing(false)
  }

  const handleDeleteWorkspace = async () => {
    if (deleteConfirmText !== currentWorkspace.name) {
      toast({
        title: "Incorrect confirmation",
        description: "Please type the workspace name exactly to confirm deletion",
        variant: "destructive",
      })
      return
    }

    if (currentWorkspace.isDefault) {
      toast({
        title: "Cannot delete default workspace",
        description: "The default workspace cannot be deleted",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      await deleteWorkspace(currentWorkspace.id)

      toast({
        title: "Workspace deleted",
        description: "The workspace has been permanently deleted",
      })

      setShowDeleteDialog(false)
      setDeleteConfirmText("")
    } catch (error) {
      console.error("Failed to delete workspace:", error)
      toast({
        title: "Failed to delete workspace",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getWorkspaceTypeIcon = (type: Workspace["type"]) => {
    switch (type) {
      case "team":
        return <Users className="h-4 w-4" />
      case "department":
        return <Building2 className="h-4 w-4" />
      case "leadership":
        return <Briefcase className="h-4 w-4" />
      case "project":
        return <Folder className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Workspace Branding - Admin only */}
      {isAdmin && <WorkspaceBrandingSettings />}

      {/* Workspace Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Workspace Members
              </CardTitle>
              <CardDescription>
                Manage who has access to {currentWorkspace.name}
              </CardDescription>
            </div>
            {isAdmin && availableToAdd.length > 0 && (
              <Select onValueChange={(userId) => handleAddMember(userId)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Add member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {workspaceMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No members yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workspaceMembers.map((member) => {
                const teamMember = teamMembers.find((tm) => tm.id === member.userId)
                if (!teamMember) return null

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={teamMember.avatar || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                          {getInitials(teamMember.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{teamMember.name}</p>
                        <p className="text-xs text-muted-foreground">{teamMember.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <Select
                          value={member.role}
                          onValueChange={(newRole) => handleRoleChange(member.userId, newRole)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                {getRoleIcon(member.role)}
                                <span className="capitalize text-xs">{member.role}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3 w-3" />
                                Viewer
                              </div>
                            </SelectItem>
                            <SelectItem value="member">
                              <div className="flex items-center gap-2">
                                <Users className="h-3 w-3" />
                                Member
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="owner">
                              <div className="flex items-center gap-2">
                                <Crown className="h-3 w-3" />
                                Owner
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className={cn("text-xs", getRoleBadgeColor(member.role))}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(member.role)}
                            <span className="capitalize">{member.role}</span>
                          </div>
                        </Badge>
                      )}

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setMemberToRemove(member.userId)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member from workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This member will lose access to all data in this workspace. They can be re-added
              later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && handleRemoveMember(memberToRemove)}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Workspace Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Workspace Details
              </CardTitle>
              <CardDescription>
                Configure workspace information and settings
              </CardDescription>
            </div>
            {isAdmin && !isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                Edit Details
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workspace-name">Workspace Name</Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Enter workspace name"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-type">Workspace Type</Label>
                <Select value={workspaceType} onValueChange={(value) => setWorkspaceType(value as Workspace["type"])}>
                  <SelectTrigger id="workspace-type">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {getWorkspaceTypeIcon(workspaceType)}
                        <span className="capitalize">{workspaceType}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team
                      </div>
                    </SelectItem>
                    <SelectItem value="department">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Department
                      </div>
                    </SelectItem>
                    <SelectItem value="leadership">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Leadership
                      </div>
                    </SelectItem>
                    <SelectItem value="project">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        Project
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-description">Description</Label>
                <Textarea
                  id="workspace-description"
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  placeholder="Enter workspace description (optional)"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {workspaceDescription.length}/500 characters
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSaveWorkspace} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Button onClick={handleCancelEdit} variant="outline" disabled={isSaving}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Name</p>
                <p className="text-base font-medium">{currentWorkspace.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
                <div className="flex items-center gap-2">
                  {getWorkspaceTypeIcon(currentWorkspace.type)}
                  <span className="text-base capitalize">{currentWorkspace.type}</span>
                </div>
              </div>
              {currentWorkspace.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-base">{currentWorkspace.description}</p>
                </div>
              )}
              {currentWorkspace.isDefault && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                  Default Workspace
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workspace Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Workspace Statistics
          </CardTitle>
          <CardDescription>Overview of workspace activity and content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Members</p>
              </div>
              <p className="text-2xl font-bold">{workspaceMembers.length}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
              </div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Rocks</p>
              </div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">EOD Reports</p>
              </div>
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isAdmin && !currentWorkspace.isDefault && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-destructive rounded-lg">
              <div>
                <p className="font-medium">Delete this workspace</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this workspace and all its data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Workspace
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Workspace Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Workspace?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the{" "}
              <strong>{currentWorkspace.name}</strong> workspace and remove all associated data
              including members, tasks, rocks, and EOD reports.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium">
              Please type <span className="font-mono font-bold">{currentWorkspace.name}</span> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type workspace name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={isDeleting || deleteConfirmText !== currentWorkspace.name}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Workspace
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
