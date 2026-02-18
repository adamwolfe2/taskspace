"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface Org {
  id: string
  name: string
}

interface CrossOrgTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgs: Org[]
  defaultSourceOrgId?: string
  defaultTargetOrgId?: string
  onCreated?: () => void
}

export function CrossOrgTaskDialog({
  open,
  onOpenChange,
  orgs,
  defaultSourceOrgId,
  defaultTargetOrgId,
  onCreated,
}: CrossOrgTaskDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [sourceOrgId, setSourceOrgId] = useState(defaultSourceOrgId || "")
  const [targetOrgId, setTargetOrgId] = useState(defaultTargetOrgId || "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("normal")

  useEffect(() => {
    if (defaultSourceOrgId) setSourceOrgId(defaultSourceOrgId)
    if (defaultTargetOrgId) setTargetOrgId(defaultTargetOrgId)
  }, [defaultSourceOrgId, defaultTargetOrgId])

  const handleCreate = async () => {
    if (!title.trim() || !sourceOrgId || !targetOrgId) return

    setLoading(true)
    try {
      const res = await fetch("/api/super-admin/cross-org-tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          sourceOrganizationId: sourceOrgId,
          targetOrganizationId: targetOrgId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
        }),
      })

      const json = await res.json()
      if (json.success) {
        toast({
          title: "Task delegated",
          description: json.message || `Task created successfully`,
        })
        setTitle("")
        setDescription("")
        setPriority("normal")
        onOpenChange(false)
        onCreated?.()
      } else {
        toast({
          title: "Error",
          description: json.error || "Failed to create task",
          variant: "destructive",
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to create cross-org task",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delegate Cross-Org Task</DialogTitle>
          <DialogDescription>
            Create a task that spans from one organization to another.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Organization</Label>
              <Select value={sourceOrgId} onValueChange={setSourceOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source org" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Organization</Label>
              <Select value={targetOrgId} onValueChange={setTargetOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target org" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.filter(o => o.id !== sourceOrgId).map(org => (
                    <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Task Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional context..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !title.trim() || !sourceOrgId || !targetOrgId}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delegate Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
