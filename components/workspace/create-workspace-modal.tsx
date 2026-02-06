"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Briefcase, Building2, Users, Folder, Plus } from "lucide-react"
import { useCreateWorkspace } from "@/lib/hooks/use-workspace"
import { useToast } from "@/hooks/use-toast"
import type { Workspace } from "@/lib/hooks/use-workspace"

interface CreateWorkspaceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const workspaceTypes = [
  {
    value: "team" as const,
    label: "Team",
    description: "For team-level coordination",
    icon: Users,
  },
  {
    value: "department" as const,
    label: "Department",
    description: "For department management",
    icon: Building2,
  },
  {
    value: "leadership" as const,
    label: "Leadership",
    description: "For executive leadership",
    icon: Briefcase,
  },
  {
    value: "project" as const,
    label: "Project",
    description: "For project-specific work",
    icon: Folder,
  },
]

export function CreateWorkspaceModal({ open, onOpenChange }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useCreateWorkspace()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [type, setType] = useState<Workspace["type"]>("team")
  const [description, setDescription] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a workspace name",
        variant: "destructive",
      })
      return
    }

    if (name.length > 100) {
      toast({
        title: "Name too long",
        description: "Workspace name must be 100 characters or less",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      await createWorkspace({
        name: name.trim(),
        type,
        description: description.trim() || undefined,
      })

      toast({
        title: "Workspace created",
        description: `${name} has been created successfully`,
      })

      // Reset form and close
      setName("")
      setType("team")
      setDescription("")
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to create workspace:", error)
      toast({
        title: "Failed to create workspace",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    setName("")
    setType("team")
    setDescription("")
    onOpenChange(false)
  }

  const selectedType = workspaceTypes.find((t) => t.value === type)
  const SelectedIcon = selectedType?.icon || Users

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            Create New Workspace
          </DialogTitle>
          <DialogDescription>
            Create a workspace for your team, department, or project. Each workspace has its own
            members, branding, and data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Workspace Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g., Marketing Team, Project Alpha, Engineering"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              disabled={isCreating}
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/100 characters
            </p>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Workspace Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as Workspace["type"])}>
              <SelectTrigger id="type" disabled={isCreating}>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <SelectedIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedType?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {workspaceTypes.map((workspaceType) => {
                  const Icon = workspaceType.icon
                  return (
                    <SelectItem key={workspaceType.value} value={workspaceType.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{workspaceType.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {workspaceType.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What is this workspace for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isCreating}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
