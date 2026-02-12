"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { useState, useMemo } from "react"
import type { Project, Client, TeamMember, Rock, AssignedTask } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, FolderKanban, MoreHorizontal, Pencil, Trash2, Calendar, Users, CheckCircle2 } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { useWorkspaceStore } from "@/lib/hooks/use-workspace"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface ProjectsPageProps {
  currentUser: TeamMember
  teamMembers: TeamMember[]
  projects: Project[]
  clients: Client[]
  rocks: Rock[]
  assignedTasks: AssignedTask[]
  createProject: (project: Partial<Project>) => Promise<Project>
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project>
  deleteProject: (id: string) => Promise<void>
}

const STATUS_COLORS: Record<string, string> = {
  planning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "on-hold": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  normal: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
}

export function ProjectsPage({
  currentUser,
  teamMembers,
  projects,
  clients,
  rocks,
  assignedTasks,
  createProject,
  updateProject,
  deleteProject,
}: ProjectsPageProps) {
  const { currentWorkspaceId } = useWorkspaceStore()
  const { toast } = useToast()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [clientFilter, setClientFilter] = useState<string>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [detailProject, setDetailProject] = useState<Project | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formClientId, setFormClientId] = useState<string>("")
  const [formStatus, setFormStatus] = useState<Project["status"]>("active")
  const [formPriority, setFormPriority] = useState<Project["priority"]>("normal")
  const [formStartDate, setFormStartDate] = useState("")
  const [formDueDate, setFormDueDate] = useState("")
  const [formOwnerId, setFormOwnerId] = useState<string>("")

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || p.status === statusFilter
      const matchesClient = clientFilter === "all" || p.clientId === clientFilter
      return matchesSearch && matchesStatus && matchesClient
    })
  }, [projects, searchQuery, statusFilter, clientFilter])

  // Stats
  const activeCount = projects.filter(p => p.status === "active").length
  const planningCount = projects.filter(p => p.status === "planning").length
  const completedCount = projects.filter(p => p.status === "completed").length

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormClientId("")
    setFormStatus("active")
    setFormPriority("normal")
    setFormStartDate("")
    setFormDueDate("")
    setFormOwnerId("")
  }

  const openCreateModal = () => {
    resetForm()
    setEditingProject(null)
    setShowCreateModal(true)
  }

  const openEditModal = (project: Project) => {
    setFormName(project.name)
    setFormDescription(project.description || "")
    setFormClientId(project.clientId || "")
    setFormStatus(project.status)
    setFormPriority(project.priority)
    setFormStartDate(project.startDate || "")
    setFormDueDate(project.dueDate || "")
    setFormOwnerId(project.ownerId || "")
    setEditingProject(project)
    setShowCreateModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) return
    setIsSubmitting(true)
    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          clientId: formClientId || null,
          status: formStatus,
          priority: formPriority,
          startDate: formStartDate || null,
          dueDate: formDueDate || null,
          ownerId: formOwnerId || null,
        })
        toast({ title: "Project updated" })
      } else {
        await createProject({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          clientId: formClientId || null,
          status: formStatus,
          priority: formPriority,
          startDate: formStartDate || null,
          dueDate: formDueDate || null,
          ownerId: formOwnerId || null,
        })
        toast({ title: "Project created" })
      }
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"? Linked tasks and rocks will be unlinked.`)) return
    try {
      await deleteProject(project.id)
      setDetailProject(null)
      toast({ title: "Project deleted" })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  const handleStatusChange = async (project: Project, status: Project["status"]) => {
    try {
      await updateProject(project.id, { status })
      toast({ title: `Project marked as ${status}` })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  // Get project tasks/rocks for detail view
  const projectTasks = detailProject ? assignedTasks.filter(t => t.projectId === detailProject.id) : []
  const projectRocks = detailProject ? rocks.filter(r => r.projectId === detailProject.id) : []

  return (
    <FeatureGate feature="core.projects">
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
        <NoWorkspaceAlert />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} active, {planningCount} planning, {completedCount} completed
            </p>
          </div>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Project
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="planning">Planning</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Projects List */}
        {filteredProjects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-12 w-12 text-muted-foreground" />}
            title="No projects found"
            description={projects.length === 0 ? "Create your first project to get started." : "Try adjusting your filters."}
            action={projects.length === 0 ? { label: "Create Project", onClick: openCreateModal } : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {filteredProjects.map(project => {
              const client = clients.find(c => c.id === project.clientId)
              const owner = teamMembers.find(m => m.userId === project.ownerId)
              return (
                <Card
                  key={project.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setDetailProject(project)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{project.name}</h3>
                          <Badge variant="outline" className={STATUS_COLORS[project.status]}>
                            {project.status}
                          </Badge>
                          <Badge variant="outline" className={PRIORITY_COLORS[project.priority]}>
                            {project.priority}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{project.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          {client && (
                            <span className="flex items-center gap-1">
                              Client: {client.name}
                            </span>
                          )}
                          {owner && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" /> {owner.name}
                            </span>
                          )}
                          {project.dueDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {project.dueDate}
                            </span>
                          )}
                          {project.taskCount !== undefined && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" /> {project.completedTaskCount ?? 0}/{project.taskCount} tasks
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <Progress value={project.progress} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center mt-0.5">{project.progress}%</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(project) }}>
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {project.status !== "completed" && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(project, "completed") }}>
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Complete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => { e.stopPropagation(); handleDelete(project) }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProject ? "Edit Project" : "New Project"}</DialogTitle>
              <DialogDescription>
                {editingProject ? "Update project details." : "Create a new project to track work."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Project name" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Client</Label>
                  <Select value={formClientId} onValueChange={setFormClientId}>
                    <SelectTrigger><SelectValue placeholder="No client" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {clients.filter(c => c.status === "active").map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Owner</Label>
                  <Select value={formOwnerId} onValueChange={setFormOwnerId}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {teamMembers.filter(m => m.status === "active" && m.userId).map(m => (
                        <SelectItem key={m.userId!} value={m.userId!}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={formStatus} onValueChange={(v) => setFormStatus(v as Project["status"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formPriority} onValueChange={(v) => setFormPriority(v as Project["priority"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!formName.trim() || isSubmitting}>
                {isSubmitting ? "Saving..." : editingProject ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!detailProject} onOpenChange={(open) => !open && setDetailProject(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {detailProject && (
              <>
                <SheetHeader>
                  <SheetTitle>{detailProject.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Badge className={STATUS_COLORS[detailProject.status]}>{detailProject.status}</Badge>
                    <Badge className={PRIORITY_COLORS[detailProject.priority]}>{detailProject.priority}</Badge>
                  </div>
                  {detailProject.description && (
                    <p className="text-sm text-muted-foreground">{detailProject.description}</p>
                  )}
                  <div>
                    <h4 className="text-sm font-medium mb-1">Progress</h4>
                    <Progress value={detailProject.progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-0.5">{detailProject.progress}%</p>
                  </div>
                  {detailProject.clientName && (
                    <div>
                      <h4 className="text-sm font-medium">Client</h4>
                      <p className="text-sm text-muted-foreground">{detailProject.clientName}</p>
                    </div>
                  )}
                  {detailProject.ownerName && (
                    <div>
                      <h4 className="text-sm font-medium">Owner</h4>
                      <p className="text-sm text-muted-foreground">{detailProject.ownerName}</p>
                    </div>
                  )}
                  {(detailProject.startDate || detailProject.dueDate) && (
                    <div className="flex gap-4">
                      {detailProject.startDate && (
                        <div>
                          <h4 className="text-sm font-medium">Start</h4>
                          <p className="text-sm text-muted-foreground">{detailProject.startDate}</p>
                        </div>
                      )}
                      {detailProject.dueDate && (
                        <div>
                          <h4 className="text-sm font-medium">Due</h4>
                          <p className="text-sm text-muted-foreground">{detailProject.dueDate}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Linked Tasks */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Linked Tasks ({projectTasks.length})</h4>
                    {projectTasks.length > 0 ? (
                      <div className="space-y-1">
                        {projectTasks.map(task => (
                          <div key={task.id} className="flex items-center gap-2 text-sm py-1">
                            <CheckCircle2 className={`h-3.5 w-3.5 ${task.status === "completed" ? "text-green-500" : "text-muted-foreground"}`} />
                            <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>{task.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No tasks linked to this project yet.</p>
                    )}
                  </div>

                  {/* Linked Rocks */}
                  {projectRocks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Linked Rocks ({projectRocks.length})</h4>
                      <div className="space-y-1">
                        {projectRocks.map(rock => (
                          <div key={rock.id} className="flex items-center gap-2 text-sm py-1">
                            <span>{rock.title}</span>
                            <Badge variant="outline" className="text-xs">{rock.progress}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => { setDetailProject(null); openEditModal(detailProject) }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(detailProject)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </FeatureGate>
  )
}
