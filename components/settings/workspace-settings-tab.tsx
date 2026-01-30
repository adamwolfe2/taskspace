"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { Users, UserPlus, Loader2, Trash2, Shield, Eye, Crown } from "lucide-react"
import { useWorkspaces, useWorkspaceDetails } from "@/lib/hooks/use-workspace"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { TeamMember } from "@/lib/types"

interface WorkspaceSettingsTabProps {
  teamMembers: TeamMember[]
}

export function WorkspaceSettingsTab({ teamMembers }: WorkspaceSettingsTabProps) {
  const { currentWorkspace, isAdmin } = useWorkspaces()
  const { details, isLoading, refresh } = useWorkspaceDetails(currentWorkspace?.id || null)
  const { toast } = useToast()

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({})

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

  return (
    <div className="space-y-6">
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
    </div>
  )
}
