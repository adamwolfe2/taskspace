"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
}

export function IdsBoardItemDialog({
  open,
  onOpenChange,
  item,
  defaultColumn = "identify",
  teamMembers = [],
  onSave,
  onDelete,
}: IdsBoardItemDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [columnName, setColumnName] = useState<IdsBoardColumn>(defaultColumn)
  const [itemType, setItemType] = useState<IdsBoardItemType>("custom")
  const [assignedTo, setAssignedTo] = useState<string>("")

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
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
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
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete()
                  onOpenChange(false)
                }}
              >
                Delete
              </Button>
            )}
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
  )
}
