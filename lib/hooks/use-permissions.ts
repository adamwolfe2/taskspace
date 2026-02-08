"use client"

import { useApp } from "@/lib/contexts/app-context"

/**
 * Hook for checking user permissions across the application
 * Centralizes role-checking logic to avoid duplication
 */
export function usePermissions() {
  const { currentUser } = useApp()

  return {
    // Role checks
    isOwner: currentUser?.role === "owner",
    isAdmin: currentUser?.role === "admin" || currentUser?.role === "owner",
    isMember: currentUser?.role === "member",

    // Permission checks
    canManageTeam: currentUser?.role === "admin" || currentUser?.role === "owner",
    canManageOrganization: currentUser?.role === "owner",
    canInviteMembers: currentUser?.role === "admin" || currentUser?.role === "owner",
    canRemoveMembers: currentUser?.role === "admin" || currentUser?.role === "owner",
    canChangeRoles: currentUser?.role === "owner",
    canAccessAdmin: currentUser?.role === "admin" || currentUser?.role === "owner",
    canManageBilling: currentUser?.role === "owner",
    canViewSettings: true, // All users can view settings
    canEditSettings: currentUser?.role === "admin" || currentUser?.role === "owner",

    // Utility function to check if user can perform action on a specific user
    canManageUser: (targetUserId: string) => {
      if (!currentUser) return false
      // Users can manage themselves (check both org_members.id and users.id)
      const effectiveUserId = currentUser.userId || currentUser.id
      if (targetUserId === currentUser.id || targetUserId === effectiveUserId) return true
      // Admins/owners can manage others
      return currentUser.role === "admin" || currentUser.role === "owner"
    },

    // Check if current user can edit a rock
    canEditRock: (rockOwnerId: string) => {
      if (!currentUser) return false
      // User owns the rock (rock.userId is users.id)
      const effectiveUserId = currentUser.userId || currentUser.id
      if (rockOwnerId === effectiveUserId || rockOwnerId === currentUser.id) return true
      // Admins/owners can edit any rock
      return currentUser.role === "admin" || currentUser.role === "owner"
    },

    // Check if current user can edit a task
    canEditTask: (taskAssigneeId: string) => {
      if (!currentUser) return false
      // User is assigned to the task (task.assigneeId is users.id)
      const effectiveUserId = currentUser.userId || currentUser.id
      if (taskAssigneeId === effectiveUserId || taskAssigneeId === currentUser.id) return true
      // Admins/owners can edit any task
      return currentUser.role === "admin" || currentUser.role === "owner"
    },
  }
}
