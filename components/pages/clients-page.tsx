"use client"

import { FeatureGate } from "@/components/shared/feature-gate"
import { useState, useMemo } from "react"
import type { Client, Project, TeamMember } from "@/lib/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Building2, MoreHorizontal, Pencil, Trash2, Mail, Phone, Globe, FolderKanban } from "lucide-react"
import { EmptyState } from "@/components/shared/empty-state"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/utils"
import { useBrandStatusStyles } from "@/lib/hooks/use-brand-status-styles"
import { NoWorkspaceAlert } from "@/components/shared/no-workspace-alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

interface ClientsPageProps {
  currentUser: TeamMember
  clients: Client[]
  projects: Project[]
  createClient: (client: Partial<Client>) => Promise<Client>
  updateClient: (id: string, updates: Partial<Client>) => Promise<Client>
  deleteClient: (id: string) => Promise<void>
}


export function ClientsPage({
  currentUser,
  clients,
  projects,
  createClient,
  updateClient,
  deleteClient,
}: ClientsPageProps) {
  const { toast } = useToast()
  const { getStatusStyle } = useBrandStatusStyles()

  // State
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("name-asc")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formContactName, setFormContactName] = useState("")
  const [formContactEmail, setFormContactEmail] = useState("")
  const [formContactPhone, setFormContactPhone] = useState("")
  const [formWebsite, setFormWebsite] = useState("")
  const [formIndustry, setFormIndustry] = useState("")
  const [formStatus, setFormStatus] = useState<Client["status"]>("active")
  const [formNotes, setFormNotes] = useState("")

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    const filtered = clients.filter(c => {
      const matchesSearch = !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      return matchesSearch && matchesStatus
    })

    const sorted = [...filtered]
    const [sortField, sortDir] = sortBy.split("-") as [string, string]
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "")
          break
        case "industry":
          comparison = (a.industry || "").localeCompare(b.industry || "")
          break
        case "createdAt":
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
          break
        case "projects":
          comparison = (a.projectCount ?? 0) - (b.projectCount ?? 0)
          break
      }
      return sortDir === "desc" ? -comparison : comparison
    })
    return sorted
  }, [clients, searchQuery, statusFilter, sortBy])

  // Stats
  const activeCount = clients.filter(c => c.status === "active").length
  const prospectCount = clients.filter(c => c.status === "prospect").length

  const resetForm = () => {
    setFormName("")
    setFormDescription("")
    setFormContactName("")
    setFormContactEmail("")
    setFormContactPhone("")
    setFormWebsite("")
    setFormIndustry("")
    setFormStatus("active")
    setFormNotes("")
  }

  const openCreateModal = () => {
    resetForm()
    setEditingClient(null)
    setShowCreateModal(true)
  }

  const openEditModal = (client: Client) => {
    setFormName(client.name)
    setFormDescription(client.description || "")
    setFormContactName(client.contactName || "")
    setFormContactEmail(client.contactEmail || "")
    setFormContactPhone(client.contactPhone || "")
    setFormWebsite(client.website || "")
    setFormIndustry(client.industry || "")
    setFormStatus(client.status)
    setFormNotes(client.notes || "")
    setEditingClient(client)
    setShowCreateModal(true)
  }

  const handleSubmit = async () => {
    if (!formName.trim()) return
    setIsSubmitting(true)
    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          contactName: formContactName.trim() || undefined,
          contactEmail: formContactEmail.trim() || undefined,
          contactPhone: formContactPhone.trim() || undefined,
          website: formWebsite.trim() || undefined,
          industry: formIndustry.trim() || undefined,
          status: formStatus,
          notes: formNotes.trim() || undefined,
        })
        toast({ title: "Client updated" })
      } else {
        await createClient({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          contactName: formContactName.trim() || undefined,
          contactEmail: formContactEmail.trim() || undefined,
          contactPhone: formContactPhone.trim() || undefined,
          website: formWebsite.trim() || undefined,
          industry: formIndustry.trim() || undefined,
          status: formStatus,
          notes: formNotes.trim() || undefined,
        })
        toast({ title: "Client created" })
      }
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (client: Client) => {
    const linkedProjects = projects.filter(p => p.clientId === client.id)
    const msg = linkedProjects.length > 0
      ? `Delete "${client.name}"? ${linkedProjects.length} project(s) will be unlinked.`
      : `Delete "${client.name}"?`
    if (!confirm(msg)) return
    try {
      await deleteClient(client.id)
      setDetailClient(null)
      toast({ title: "Client deleted" })
    } catch (err) {
      toast({ title: "Error", description: getErrorMessage(err), variant: "destructive" })
    }
  }

  // Get client projects for detail view
  const clientProjects = detailClient ? projects.filter(p => p.clientId === detailClient.id) : []

  return (
    <FeatureGate feature="core.clients">
      <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
        <NoWorkspaceAlert />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} active, {prospectCount} prospects
            </p>
          </div>
          <Button onClick={openCreateModal} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Client
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="status-asc">Status</SelectItem>
              <SelectItem value="industry-asc">Industry</SelectItem>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="projects-desc">Most Projects</SelectItem>
              <SelectItem value="projects-asc">Fewest Projects</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
            title="No clients found"
            description={clients.length === 0 ? "Add your first client to get started." : "Try adjusting your filters."}
            action={clients.length === 0 ? { label: "Add Client", onClick: openCreateModal } : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClients.map(client => (
              <Card
                key={client.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailClient(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{client.name}</h3>
                        <Badge variant="outline" style={getStatusStyle(client.status)}>
                          {client.status}
                        </Badge>
                      </div>
                      {client.industry && (
                        <p className="text-xs text-muted-foreground mt-0.5">{client.industry}</p>
                      )}
                      {client.contactName && (
                        <p className="text-sm mt-2">{client.contactName}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {client.contactEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {client.contactEmail}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <FolderKanban className="h-3 w-3" />
                        <span>{client.projectCount ?? 0} projects ({client.activeProjectCount ?? 0} active)</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(client) }}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(client) }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingClient ? "Edit Client" : "New Client"}</DialogTitle>
              <DialogDescription>
                {editingClient ? "Update client details." : "Add a new client to your workspace."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Client name" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Brief description" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input type="email" value={formContactEmail} onChange={(e) => setFormContactEmail(e.target.value)} placeholder="john@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Phone</Label>
                  <Input value={formContactPhone} onChange={(e) => setFormContactPhone(e.target.value)} placeholder="(555) 123-4567" />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input value={formIndustry} onChange={(e) => setFormIndustry(e.target.value)} placeholder="Real Estate" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Website</Label>
                  <Input value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)} placeholder="https://example.com" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formStatus} onValueChange={(v) => setFormStatus(v as Client["status"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Additional notes..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!formName.trim() || isSubmitting}>
                {isSubmitting ? "Saving..." : editingClient ? "Save Changes" : "Add Client"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Sheet */}
        <Sheet open={!!detailClient} onOpenChange={(open) => !open && setDetailClient(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {detailClient && (
              <>
                <SheetHeader>
                  <SheetTitle>{detailClient.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="outline" style={getStatusStyle(detailClient.status)}>{detailClient.status}</Badge>
                    {detailClient.industry && <Badge variant="outline">{detailClient.industry}</Badge>}
                  </div>
                  {detailClient.description && (
                    <p className="text-sm text-muted-foreground">{detailClient.description}</p>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Contact Information</h4>
                    {detailClient.contactName && (
                      <p className="text-sm">{detailClient.contactName}</p>
                    )}
                    {detailClient.contactEmail && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`mailto:${detailClient.contactEmail}`} className="text-primary hover:underline">{detailClient.contactEmail}</a>
                      </p>
                    )}
                    {detailClient.contactPhone && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" /> {detailClient.contactPhone}
                      </p>
                    )}
                    {detailClient.website && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={detailClient.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{detailClient.website}</a>
                      </p>
                    )}
                  </div>

                  {/* Notes */}
                  {detailClient.notes && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailClient.notes}</p>
                    </div>
                  )}

                  {/* Linked Projects */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Projects ({clientProjects.length})</h4>
                    {clientProjects.length > 0 ? (
                      <div className="space-y-2">
                        {clientProjects.map(project => (
                          <div key={project.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50">
                            <span>{project.name}</span>
                            <Badge variant="outline" className="text-xs">{project.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No projects linked to this client.</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => { setDetailClient(null); openEditModal(detailClient) }}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(detailClient)}>
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
