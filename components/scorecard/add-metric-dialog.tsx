"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Loader2, TrendingUp, TrendingDown, Target } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface AddMetricDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  onMetricAdded: () => void
  members?: Array<{ id: string; name: string }>
  editMetric?: {
    id: string
    name: string
    description?: string
    ownerId?: string
    targetValue?: number
    targetDirection: string
    unit: string
    frequency: string
  } | null
}

export function AddMetricDialog({
  open,
  onOpenChange,
  workspaceId,
  onMetricAdded,
  members = [],
  editMetric,
}: AddMetricDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ownerId: "",
    targetValue: "",
    targetDirection: "above",
    unit: "",
    frequency: "weekly",
  })

  // Reset form when dialog opens/closes or editMetric changes
  useEffect(() => {
    if (open) {
      if (editMetric) {
        setFormData({
          name: editMetric.name,
          description: editMetric.description || "",
          ownerId: editMetric.ownerId || "",
          targetValue: editMetric.targetValue?.toString() || "",
          targetDirection: editMetric.targetDirection,
          unit: editMetric.unit || "",
          frequency: editMetric.frequency || "weekly",
        })
      } else {
        setFormData({
          name: "",
          description: "",
          ownerId: "",
          targetValue: "",
          targetDirection: "above",
          unit: "",
          frequency: "weekly",
        })
      }
    }
  }, [open, editMetric])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Metric name is required",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const payload = {
        workspaceId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        ownerId: formData.ownerId || undefined,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : undefined,
        targetDirection: formData.targetDirection,
        unit: formData.unit.trim(),
        frequency: formData.frequency,
      }

      const url = editMetric
        ? `/api/scorecards/metrics/${editMetric.id}`
        : "/api/scorecards/metrics"

      const method = editMetric ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Failed to save metric")
      }

      toast({
        title: editMetric ? "Metric Updated" : "Metric Created",
        description: `"${formData.name}" has been ${editMetric ? "updated" : "added"} to the scorecard`,
      })

      onOpenChange(false)
      onMetricAdded()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save metric",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editMetric ? "Edit Metric" : "Add New Metric"}</DialogTitle>
          <DialogDescription>
            {editMetric
              ? "Update the metric settings. Changes will apply to future entries."
              : "Define a measurable metric to track weekly on the scorecard."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Metric Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Sales Calls, Code Reviews, Support Tickets"
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this metric measure? How should it be counted?"
              className="min-h-[60px]"
              disabled={isLoading}
            />
          </div>

          {/* Owner */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="owner">Owner</Label>
              <Select
                value={formData.ownerId}
                onValueChange={(value) => setFormData({ ...formData, ownerId: value })}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select owner (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No owner</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target Value and Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target Value</Label>
              <Input
                id="targetValue"
                type="number"
                step="any"
                value={formData.targetValue}
                onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })}
                placeholder="e.g., 50"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., calls, %, hrs"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Target Direction */}
          <div className="space-y-2">
            <Label>Target Direction</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={formData.targetDirection === "above" ? "default" : "outline"}
                className="w-full"
                onClick={() => setFormData({ ...formData, targetDirection: "above" })}
                disabled={isLoading}
              >
                <TrendingUp className="h-4 w-4 mr-1" />
                Above
              </Button>
              <Button
                type="button"
                variant={formData.targetDirection === "below" ? "default" : "outline"}
                className="w-full"
                onClick={() => setFormData({ ...formData, targetDirection: "below" })}
                disabled={isLoading}
              >
                <TrendingDown className="h-4 w-4 mr-1" />
                Below
              </Button>
              <Button
                type="button"
                variant={formData.targetDirection === "exact" ? "default" : "outline"}
                className="w-full"
                onClick={() => setFormData({ ...formData, targetDirection: "exact" })}
                disabled={isLoading}
              >
                <Target className="h-4 w-4 mr-1" />
                Exact
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {formData.targetDirection === "above" && "Higher values are better (>=)"}
              {formData.targetDirection === "below" && "Lower values are better (<=)"}
              {formData.targetDirection === "exact" && "Value should match target closely (=)"}
            </p>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Tracking Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value })}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editMetric ? "Save Changes" : "Add Metric"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
