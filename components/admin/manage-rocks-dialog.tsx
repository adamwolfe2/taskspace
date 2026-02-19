"use client"

import { useState } from "react"
import type { Rock, TeamMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2, Plus, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ManageRocksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teamMembers: TeamMember[]
  rocks: Rock[]
  setRocks: (rocks: Rock[]) => void
}

export function ManageRocksDialog({ open, onOpenChange, teamMembers, rocks, setRocks }: ManageRocksDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [editingRock, setEditingRock] = useState<Rock | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [quarterFilter, setQuarterFilter] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(false)
  const [deletingRockId, setDeletingRockId] = useState<string | null>(null)
  const currentQuarter = `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    bucket: "",
    outcome: "",
    doneWhen: [""],
    dueDate: "",
    quarter: currentQuarter,
  })
  const { toast } = useToast()
  const { currentWorkspace } = useWorkspaces()

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    setShowForm(false)
    setEditingRock(null)
    setQuarterFilter("all") // Reset filter when switching users
  }

  const handleEditRock = (rock: Rock) => {
    setEditingRock(rock)
    setFormData({
      title: rock.title,
      description: rock.description,
      bucket: rock.bucket || "",
      outcome: rock.outcome || "",
      doneWhen: rock.doneWhen || [""],
      dueDate: rock.dueDate,
      quarter: rock.quarter || currentQuarter,
    })
    setShowForm(true)
  }

  const handleAddNew = () => {
    if (!selectedUserId) {
      toast({
        title: "Select a user",
        description: "Please select a team member first",
        variant: "destructive",
      })
      return
    }
    setEditingRock(null)
    setFormData({
      title: "",
      description: "",
      bucket: "",
      outcome: "",
      doneWhen: [""],
      dueDate: "",
      quarter: currentQuarter,
    })
    setShowForm(true)
  }

  const handleDeleteRock = async (rockId: string) => {
    setDeletingRockId(rockId)
    try {
      const response = await fetch(`/api/rocks?id=${rockId}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to delete rock")
      }

      // Update local state after successful API call
      setRocks(rocks.filter((r) => r.id !== rockId))
      toast({
        title: "Rock Deleted",
        description: "The rock has been permanently removed",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete rock",
        variant: "destructive",
      })
    } finally {
      setDeletingRockId(null)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing Fields",
        description: "Please fill in title and description",
        variant: "destructive",
      })
      return
    }

    if (!currentWorkspace) {
      toast({
        title: "Error",
        description: "No workspace selected",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    const doneWhenFiltered = formData.doneWhen.filter((item) => item.trim() !== "")

    try {
      if (editingRock) {
        // Update existing rock via API
        const response = await fetch("/api/rocks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({
            id: editingRock.id,
            title: formData.title,
            description: formData.description,
            bucket: formData.bucket,
            outcome: formData.outcome,
            doneWhen: doneWhenFiltered,
            dueDate: formData.dueDate,
            quarter: formData.quarter,
          }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Failed to update rock")
        }

        // Update local state with response data
        setRocks(
          rocks.map((r) =>
            r.id === editingRock.id ? { ...r, ...data.data } : r
          )
        )
        toast({
          title: "Rock Updated",
          description: "The rock has been saved successfully",
        })
      } else {
        // Create new rock via API
        const response = await fetch("/api/rocks", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            bucket: formData.bucket,
            outcome: formData.outcome,
            doneWhen: doneWhenFiltered,
            dueDate: formData.dueDate,
            quarter: formData.quarter,
            userId: selectedUserId,
            workspaceId: currentWorkspace.id,
          }),
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || "Failed to create rock")
        }

        // Add the new rock from API response to local state
        setRocks([...rocks, data.data])
        toast({
          title: "Rock Created",
          description: "A new rock has been saved successfully",
        })
      }

      setShowForm(false)
      setEditingRock(null)
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save rock",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addDoneWhenField = () => {
    setFormData({
      ...formData,
      doneWhen: [...formData.doneWhen, ""],
    })
  }

  const removeDoneWhenField = (index: number) => {
    setFormData({
      ...formData,
      doneWhen: formData.doneWhen.filter((_, i) => i !== index),
    })
  }

  const updateDoneWhenField = (index: number, value: string) => {
    const updated = [...formData.doneWhen]
    updated[index] = value
    setFormData({ ...formData, doneWhen: updated })
  }

  const selectedUser = teamMembers.find((m) => m.id === selectedUserId)
  // Filter rocks for this user - match by userId OR ownerEmail (for draft members)
  const allUserRocks = rocks.filter((r) => {
    if (!selectedUser) return false
    // Match by user.id (for accepted members)
    if (selectedUser.userId && r.userId === selectedUser.userId) return true
    // Match by email (for draft members who haven't accepted yet)
    if (!r.userId && r.ownerEmail && r.ownerEmail.toLowerCase() === selectedUser.email.toLowerCase()) return true
    return false
  })

  // Extract unique quarters from user's rocks for the filter dropdown
  const availableQuarters = [...new Set(allUserRocks.map((r) => r.quarter).filter(Boolean))]
    .sort((a, b) => {
      // Sort by year descending, then quarter descending (Q4 > Q1)
      const [qA, yA] = (a || "").split(" ")
      const [qB, yB] = (b || "").split(" ")
      if (yA !== yB) return parseInt(yB || "0") - parseInt(yA || "0")
      return (qB || "").localeCompare(qA || "")
    })

  // Filter rocks by selected quarter
  const userRocks = quarterFilter === "all"
    ? allUserRocks
    : allUserRocks.filter((r) => r.quarter === quarterFilter)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Rocks</DialogTitle>
          <DialogDescription>Add, edit, or remove rocks for team members</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label>Select Team Member</Label>
            <Select value={selectedUserId} onValueChange={handleSelectUser}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} - {member.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rocks List */}
          {selectedUser && !showForm && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">
                    {selectedUser.name}'s Rocks ({userRocks.length}{quarterFilter !== "all" ? ` of ${allUserRocks.length}` : ""})
                  </h3>
                  {availableQuarters.length > 0 && (
                    <Select value={quarterFilter} onValueChange={setQuarterFilter}>
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Filter quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Quarters</SelectItem>
                        {availableQuarters.map((quarter) => (
                          <SelectItem key={quarter} value={quarter || "unknown"}>
                            {quarter}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button onClick={handleAddNew} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rock
                </Button>
              </div>

              {userRocks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {quarterFilter !== "all" && allUserRocks.length > 0
                      ? `No rocks found for ${quarterFilter}. Try selecting a different quarter.`
                      : "No rocks assigned yet. Click \"Add Rock\" to create one."}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {userRocks.map((rock) => (
                    <Card key={rock.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{rock.title}</CardTitle>
                            <div className="flex items-center gap-3 mt-1">
                              {rock.quarter && (
                                <Badge variant="brand-primary-soft">
                                  {rock.quarter}
                                </Badge>
                              )}
                              {rock.bucket && <p className="text-sm text-muted-foreground">Bucket: {rock.bucket}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRock(rock)}
                              disabled={deletingRockId === rock.id}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRock(rock.id)}
                              disabled={deletingRockId !== null}
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingRockId === rock.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-2">{rock.description}</p>
                        {rock.outcome && <p className="text-sm text-muted-foreground mb-2">Outcome: {rock.outcome}</p>}
                        {rock.doneWhen && rock.doneWhen.length > 0 && (
                          <div className="text-sm">
                            <p className="font-medium mb-1">Done When:</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                              {rock.doneWhen.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span>Progress: {rock.progress}%</span>
                          <span className="text-muted-foreground">Due: {rock.dueDate}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rock Form */}
          {showForm && selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{editingRock ? "Edit Rock" : "Add New Rock"}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowForm(false)
                    setEditingRock(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Rock Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Enter rock title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter rock description"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bucket">Bucket (Category)</Label>
                    <Input
                      id="bucket"
                      value={formData.bucket}
                      onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
                      placeholder="e.g., Marketing, Operations"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="outcome">Outcome</Label>
                    <Textarea
                      id="outcome"
                      value={formData.outcome}
                      onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                      placeholder="What is the expected outcome?"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Done When (Success Criteria)</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addDoneWhenField}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Criteria
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {formData.doneWhen.map((item, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            value={item}
                            onChange={(e) => updateDoneWhenField(index, e.target.value)}
                            placeholder="Enter success criteria"
                          />
                          {formData.doneWhen.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDoneWhenField(index)}
                              aria-label="Remove criterion"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quarter">Quarter</Label>
                    <Select
                      value={formData.quarter}
                      onValueChange={(value) => setFormData({ ...formData, quarter: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select quarter" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const now = new Date()
                          const year = now.getFullYear()
                          const options: string[] = []
                          for (let y = year - 1; y <= year + 1; y++) {
                            for (let q = 1; q <= 4; q++) {
                              options.push(`Q${q} ${y}`)
                            }
                          }
                          return options.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSubmit} className="flex-1" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        editingRock ? "Update Rock" : "Add Rock"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => {
                        setShowForm(false)
                        setEditingRock(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
