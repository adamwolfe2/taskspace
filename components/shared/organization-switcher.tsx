"use client"

import { useState, useEffect } from "react"
import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building,
  ChevronDown,
  Plus,
  Check,
  Crown,
  Shield,
  Users,
  Loader2,
} from "lucide-react"
import type { UserOrganizationItem } from "@/lib/types"

interface OrganizationSwitcherProps {
  compact?: boolean
}

export function OrganizationSwitcher({ compact = false }: OrganizationSwitcherProps) {
  const { currentOrganization, refreshSession } = useApp()
  const [organizations, setOrganizations] = useState<UserOrganizationItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newOrgName, setNewOrgName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch user's organizations
  useEffect(() => {
    const fetchOrganizations = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/user/organizations")
        const data = await response.json()
        if (data.success && data.data?.organizations) {
          setOrganizations(data.data.organizations)
        }
      } catch (err) {
        console.error("Failed to fetch organizations:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrganizations()
  }, [currentOrganization?.id])

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === currentOrganization?.id) return

    setIsSwitching(true)
    setError(null)

    try {
      const response = await fetch("/api/user/switch-organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      })

      const data = await response.json()

      if (data.success) {
        // Refresh the entire app state
        await refreshSession()
        // Force a page reload to ensure all data is fresh
        window.location.reload()
      } else {
        setError(data.error || "Failed to switch organization")
      }
    } catch (err) {
      console.error("Failed to switch organization:", err)
      setError("Failed to switch organization")
    } finally {
      setIsSwitching(false)
    }
  }

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch("/api/user/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        setShowCreateDialog(false)
        setNewOrgName("")
        // Switch to the new organization
        await handleSwitchOrganization(data.data.organization.id)
      } else {
        setError(data.error || "Failed to create organization")
      }
    } catch (err) {
      console.error("Failed to create organization:", err)
      setError("Failed to create organization")
    } finally {
      setIsCreating(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3 text-amber-500" />
      case "admin":
        return <Shield className="h-3 w-3 text-blue-500" />
      default:
        return <Users className="h-3 w-3 text-gray-400" />
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] px-1.5 py-0">
            Owner
          </Badge>
        )
      case "admin":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5 py-0">
            Admin
          </Badge>
        )
      default:
        return null
    }
  }

  const currentOrgLogo = currentOrganization?.settings?.customBranding?.logo
  const currentOrgColor = currentOrganization?.settings?.customBranding?.primaryColor || "#dc2626"

  // Only show the switcher if user has multiple organizations or is loading
  const showSwitcher = organizations.length > 1 || isLoading

  if (compact) {
    // Compact version for mobile
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 gap-1.5"
            disabled={isSwitching}
          >
            {currentOrgLogo ? (
              <img
                src={currentOrgLogo}
                alt={currentOrganization?.name || "Organization"}
                className="w-5 h-5 rounded object-cover"
              />
            ) : (
              <div
                className="w-5 h-5 rounded flex items-center justify-center"
                style={{ backgroundColor: `${currentOrgColor}15` }}
              >
                <Building className="h-3 w-3" style={{ color: currentOrgColor }} />
              </div>
            )}
            {showSwitcher && <ChevronDown className="h-3 w-3 text-gray-400" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-gray-500">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {renderOrgList()}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  function renderOrgList() {
    return (
      <>
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleSwitchOrganization(org.id)}
            className={`cursor-pointer py-2 ${
              org.isCurrent ? "bg-gray-50" : ""
            }`}
          >
            <div className="flex items-center gap-3 w-full">
              {org.logoUrl ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: `${org.primaryColor || "#dc2626"}15`,
                  }}
                >
                  <Building
                    className="h-4 w-4"
                    style={{ color: org.primaryColor || "#dc2626" }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {org.name}
                  </span>
                  {org.isCurrent && (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getRoleIcon(org.role)}
                  <span className="text-xs text-gray-500 capitalize">
                    {org.role}
                  </span>
                  {org.subscriptionTier && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-xs text-gray-500">
                        {org.subscriptionTier}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setShowCreateDialog(true)}
          className="cursor-pointer text-gray-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create new workspace
        </DropdownMenuItem>
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 hover:bg-gray-100 px-2 h-10"
            disabled={isSwitching}
          >
            {isSwitching ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : currentOrgLogo ? (
              <img
                src={currentOrgLogo}
                alt={currentOrganization?.name || "Organization"}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${currentOrgColor}15` }}
              >
                <Building className="h-4 w-4" style={{ color: currentOrgColor }} />
              </div>
            )}
            <div className="hidden md:flex flex-col items-start">
              <span className="font-semibold text-gray-900 text-sm leading-tight">
                {currentOrganization?.name || "Organization"}
              </span>
              {organizations.find((o) => o.isCurrent)?.role && (
                <span className="text-xs text-gray-500 capitalize">
                  {organizations.find((o) => o.isCurrent)?.role}
                </span>
              )}
            </div>
            {showSwitcher && (
              <ChevronDown className="h-4 w-4 text-gray-400 hidden md:block" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
            Switch workspace
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading ? (
            <div className="py-4 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            renderOrgList()
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Organization Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create new workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to manage a different team or organization.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="org-name">Workspace name</Label>
              <Input
                id="org-name"
                placeholder="e.g., Acme Corp, Marketing Team"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newOrgName.trim()) {
                    handleCreateOrganization()
                  }
                }}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateOrganization}
              disabled={!newOrgName.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create workspace"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
