"use client"

import { useState } from "react"
import type { Rock, TeamMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Trash2, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    bucket: "",
    outcome: "",
    doneWhen: [""],
    dueDate: "",
    quarter: "Q1 2025",
  })
  const { toast } = useToast()

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
      quarter: rock.quarter || "Q1 2025",
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
      quarter: "Q1 2025",
    })
    setShowForm(true)
  }

  const handleDeleteRock = (rockId: string) => {
    setRocks(rocks.filter((r) => r.id !== rockId))
    toast({
      title: "Rock Deleted",
      description: "The rock has been removed",
    })
  }

  const handleSubmit = () => {
    if (!formData.title || !formData.description) {
      toast({
        title: "Missing Fields",
        description: "Please fill in title and description",
        variant: "destructive",
      })
      return
    }

    const doneWhenFiltered = formData.doneWhen.filter((item) => item.trim() !== "")

    if (editingRock) {
      setRocks(
        rocks.map((r) =>
          r.id === editingRock.id
            ? {
                ...r,
                ...formData,
                doneWhen: doneWhenFiltered,
                quarter: formData.quarter,
              }
            : r,
        ),
      )
      toast({
        title: "Rock Updated",
        description: "The rock has been updated successfully",
      })
    } else {
      const now = new Date().toISOString()
      const newRock: Rock = {
        id: `rock-${Date.now()}`,
        organizationId: "", // Will be set by API
        userId: selectedUserId,
        ...formData,
        doneWhen: doneWhenFiltered,
        quarter: formData.quarter,
        progress: 0,
        status: "on-track",
        createdAt: now,
        updatedAt: now,
      }
      setRocks([...rocks, newRock])
      toast({
        title: "Rock Added",
        description: "A new rock has been added",
      })
    }

    setShowForm(false)
    setEditingRock(null)
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
  const allUserRocks = rocks.filter((r) => r.userId === selectedUserId)

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
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                  {rock.quarter}
                                </span>
                              )}
                              {rock.bucket && <p className="text-sm text-muted-foreground">Bucket: {rock.bucket}</p>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditRock(rock)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRock(rock.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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
                        <SelectItem value="Q4 2024">Q4 2024</SelectItem>
                        <SelectItem value="Q1 2025">Q1 2025</SelectItem>
                        <SelectItem value="Q2 2025">Q2 2025</SelectItem>
                        <SelectItem value="Q3 2025">Q3 2025</SelectItem>
                        <SelectItem value="Q4 2025">Q4 2025</SelectItem>
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
                    <Button onClick={handleSubmit} className="flex-1">
                      {editingRock ? "Update Rock" : "Add Rock"}
                    </Button>
                    <Button
                      variant="outline"
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
