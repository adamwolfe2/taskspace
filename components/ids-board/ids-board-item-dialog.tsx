"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Target, ClipboardList } from "lucide-react"
import type { IdsBoardItem, IdsBoardColumn, IdsBoardItemType, TeamMember } from "@/lib/types"

interface IdsBoardItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: IdsBoardItem | null
  defaultColumn?: IdsBoardColumn
  teamMembers?: TeamMember[]
  onSave: (data: {
    title: string
    description?: string
    columnName: IdsBoardColumn
    itemType: IdsBoardItemType
    assignedTo?: string
  }) => void
  onDelete?: () => void
  onConvertToRock?: () => void
  onConvertToTask?: () => void
}

export function IdsBoardItemDialog({
  open,
  onOpenChange,
  item,
  defaultColumn = "identify",
  teamMembers = [],
  onSave,
  onDelete,
  onConvertToRock,
  onConvertToTask,
}: IdsBoardItemDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [columnName, setColumnName] = useState<IdsBoardColumn>(defaultColumn)
  const [itemType, setItemType] = useState<IdsBoardItemType>("custom")
  const [assignedTo, setAssignedTo] = useState<string>("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setDescription(item.description || "")
      setColumnName(item.columnName)
      setItemType(item.itemType)
      setAssignedTo(item.assignedTo || "")
    } else {
      setTitle("")
      setDescription("")
      setColumnName(defaultColumn)
      setItemType("custom")
      setAssignedTo("")
    }
  }, [item, defaultColumn, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      columnName,
      itemType,
      assignedTo: assignedTo || undefined,
    })
    onOpenChange(false)
  }

  const isEditing = !!item

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add Item"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be addressed?"
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Column</Label>
              <Select value={columnName} onValueChange={(v) => setColumnName(v as IdsBoardColumn)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identify">Identify</SelectItem>
                  <SelectItem value="discuss">Discuss</SelectItem>
                  <SelectItem value="solve">Solve</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={itemType} onValueChange={(v) => setItemType(v as IdsBoardItemType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                  <SelectItem value="rock">Rock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {teamMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={assignedTo || "none"} onValueChange={(v) => setAssignedTo(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {teamMembers
                    .filter((m) => m.userId && m.status === "active")
                    .map((m) => (
                      <SelectItem key={m.userId} value={m.userId!}>
                        {m.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {isEditing && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>
              )}
              {isEditing && onConvertToRock && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onConvertToRock()
                    onOpenChange(false)
                  }}
                  className="text-primary border-primary/30 hover:bg-primary/5"
                >
                  <Target className="h-3.5 w-3.5 mr-1.5" />
                  Convert to Rock
                </Button>
              )}
              {isEditing && onConvertToTask && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onConvertToTask()
                    onOpenChange(false)
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                  Convert to Task
                </Button>
              )}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!title.trim()}>
                {isEditing ? "Save" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{title}&rdquo; will be permanently removed from the IDS board. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onDelete?.()
              onOpenChange(false)
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
