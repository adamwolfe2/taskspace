"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Briefcase, Building2, Users, Folder, ChevronDown, Plus, Check, Settings } from "lucide-react"
import { useWorkspaces, type WorkspaceWithMemberInfo } from "@/lib/hooks/use-workspace"
import { CreateWorkspaceModal } from "./create-workspace-modal"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

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
// WORKSPACE AVATAR
// ============================================

const WorkspaceAvatar = ({
  workspace,
  size = "default",
}: {
  workspace: WorkspaceWithMemberInfo
  size?: "sm" | "default"
}) => {
  const sizeClass = size === "sm" ? "h-6 w-6" : "h-8 w-8"
  const iconSizeClass = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Avatar className={sizeClass}>
      {workspace.logoUrl ? (
        <AvatarImage src={workspace.logoUrl} alt={workspace.name} />
      ) : null}
      <AvatarFallback
        style={{
          backgroundColor: workspace.primaryColor || undefined,
          color: workspace.primaryColor ? "#ffffff" : undefined,
        }}
      >
        <WorkspaceIcon type={workspace.type} className={iconSizeClass} />
      </AvatarFallback>
    </Avatar>
  )
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
  const [open, setOpen] = React.useState(false)
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const router = useRouter()

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Skeleton className="h-10 w-[220px]" />
      </div>
    )
  }

  // If no workspaces, don't render
  if (workspaces.length === 0) {
    return null
  }

  // Group workspaces by type
  const groupedWorkspaces = React.useMemo(() => {
    const groups: Record<string, WorkspaceWithMemberInfo[]> = {
      leadership: [],
      department: [],
      team: [],
      project: [],
    }
    workspaces.forEach((workspace) => {
      if (groups[workspace.type]) {
        groups[workspace.type].push(workspace)
      }
    })
    return groups
  }, [workspaces])

  const typeLabels = {
    leadership: "Leadership",
    department: "Departments",
    team: "Teams",
    project: "Projects",
  }

  // If only one workspace, just show it without dropdown
  if (workspaces.length === 1 && currentWorkspace) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm bg-background",
          className
        )}
      >
        <WorkspaceAvatar workspace={currentWorkspace} size="sm" />
        <span className="font-medium">{currentWorkspace.name}</span>
        {currentWorkspace.isDefault && (
          <Badge variant="secondary" className="text-xs">
            Default
          </Badge>
        )}
        {currentWorkspace.role && (
          <Badge variant="outline" className="text-xs capitalize">
            {currentWorkspace.role}
          </Badge>
        )}
      </div>
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-[280px] justify-between", className)}
          >
            {currentWorkspace ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <WorkspaceAvatar workspace={currentWorkspace} size="sm" />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-sm font-medium truncate max-w-full">
                    {currentWorkspace.name}
                  </span>
                  {currentWorkspace.role && (
                    <span className="text-xs text-muted-foreground capitalize">
                      {currentWorkspace.role}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span>Select workspace...</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            {workspaces.length > 5 && <CommandInput placeholder="Search workspaces..." />}
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              {Object.entries(groupedWorkspaces).map(([type, typeWorkspaces]) => {
                if (typeWorkspaces.length === 0) return null
                return (
                  <CommandGroup key={type} heading={typeLabels[type as keyof typeof typeLabels]}>
                    {typeWorkspaces.map((workspace) => (
                      <CommandItem
                        key={workspace.id}
                        value={workspace.id}
                        onSelect={() => {
                          switchWorkspace(workspace.id)
                          setOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <WorkspaceAvatar workspace={workspace} size="sm" />
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate">{workspace.name}</span>
                              {workspace.isDefault && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {workspace.role && (
                                <span className="capitalize">{workspace.role}</span>
                              )}
                              {showMemberCount && (
                                <span>{workspace.memberCount} members</span>
                              )}
                            </div>
                          </div>
                          {workspace.id === currentWorkspaceId && (
                            <Check className="h-4 w-4 shrink-0" />
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )
              })}
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setCreateModalOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create workspace</span>
                </CommandItem>
                {currentWorkspace && (
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      router.push(`/?view=settings&tab=workspace`)
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Workspace settings</span>
                  </CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
    return <Skeleton className="h-6 w-24" />
  }

  if (!currentWorkspace) {
    return null
  }

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <Avatar className="h-5 w-5">
        {currentWorkspace.logoUrl ? (
          <AvatarImage src={currentWorkspace.logoUrl} alt={currentWorkspace.name} />
        ) : null}
        <AvatarFallback
          className="text-xs"
          style={{
            backgroundColor: currentWorkspace.primaryColor || undefined,
            color: currentWorkspace.primaryColor ? "#ffffff" : undefined,
          }}
        >
          <WorkspaceIcon type={currentWorkspace.type} className="h-2.5 w-2.5" />
        </AvatarFallback>
      </Avatar>
      <span className="truncate max-w-[120px] font-medium">{currentWorkspace.name}</span>
    </div>
  )
}

// ============================================
// EXPORTS
// ============================================

export { WorkspaceIcon, WorkspaceAvatar }
export type { WorkspaceSwitcherProps, WorkspaceIndicatorProps }
