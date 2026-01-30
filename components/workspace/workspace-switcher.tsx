"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Briefcase, Building2, Users, Folder, ChevronDown, Plus } from "lucide-react"
import { useWorkspaces, type WorkspaceWithMemberInfo } from "@/lib/hooks/use-workspace"
import { CreateWorkspaceModal } from "./create-workspace-modal"
import { cn } from "@/lib/utils"

// ============================================
// WORKSPACE TYPE ICONS
// ============================================

const WorkspaceIcon = ({
  type,
  className,
}: {
  type: WorkspaceWithMemberInfo["type"]
  className?: string
}) => {
  const icons = {
    leadership: Briefcase,
    department: Building2,
    team: Users,
    project: Folder,
  }
  const Icon = icons[type] || Users
  return <Icon className={cn("h-4 w-4", className)} />
}

// ============================================
// WORKSPACE SWITCHER COMPONENT
// ============================================

interface WorkspaceSwitcherProps {
  className?: string
  showMemberCount?: boolean
  showType?: boolean
  size?: "sm" | "default"
}

export function WorkspaceSwitcher({
  className,
  showMemberCount = false,
  showType = true,
  size = "default",
}: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspace, currentWorkspaceId, isLoading, switchWorkspace } =
    useWorkspaces()
  const [createModalOpen, setCreateModalOpen] = React.useState(false)

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-10 w-[180px]" />
      </div>
    )
  }

  // If no workspaces, don't render
  if (workspaces.length === 0) {
    return null
  }

  // If only one workspace, just show it without dropdown
  if (workspaces.length === 1 && currentWorkspace) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
          className
        )}
      >
        <WorkspaceIcon type={currentWorkspace.type} className="text-muted-foreground" />
        <span className="font-medium">{currentWorkspace.name}</span>
        {currentWorkspace.isDefault && (
          <Badge variant="secondary" className="text-xs">
            Default
          </Badge>
        )}
      </div>
    )
  }

  return (
    <>
      <Select
        value={currentWorkspaceId || undefined}
        onValueChange={(value) => switchWorkspace(value)}
      >
        <SelectTrigger className={cn("w-[220px]", className)} size={size}>
          <SelectValue placeholder="Select workspace">
            {currentWorkspace && (
              <div className="flex items-center gap-2">
                <WorkspaceIcon type={currentWorkspace.type} className="text-muted-foreground" />
                <span className="truncate">{currentWorkspace.name}</span>
                {currentWorkspace.isDefault && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    Default
                  </Badge>
                )}
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2">
                  <WorkspaceIcon type={workspace.type} className="text-muted-foreground" />
                  <span className="truncate">{workspace.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {workspace.isDefault && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                  {showMemberCount && (
                    <span className="text-xs text-muted-foreground">
                      {workspace.memberCount} members
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}

          {/* Create New Workspace Button */}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setCreateModalOpen(true)
              }}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Create new workspace</span>
            </button>
          </div>
        </SelectContent>
      </Select>

      <CreateWorkspaceModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </>
  )
}

// ============================================
// COMPACT WORKSPACE INDICATOR
// ============================================

interface WorkspaceIndicatorProps {
  className?: string
}

export function WorkspaceIndicator({ className }: WorkspaceIndicatorProps) {
  const { currentWorkspace, isLoading } = useWorkspaces()

  if (isLoading) {
    return <Skeleton className="h-6 w-20" />
  }

  if (!currentWorkspace) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
      <WorkspaceIcon type={currentWorkspace.type} className="h-3.5 w-3.5" />
      <span className="truncate max-w-[120px]">{currentWorkspace.name}</span>
    </div>
  )
}

// ============================================
// EXPORTS
// ============================================

export { WorkspaceIcon }
export type { WorkspaceSwitcherProps, WorkspaceIndicatorProps }
