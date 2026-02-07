"use client"

import { useApp } from "@/lib/contexts/app-context"
import { LayoutDashboard, History, Target, Shield, Users, CheckSquare, Settings, Zap, BarChart3, Calendar, UsersRound, TableProperties, ExternalLink, Network, Database, AlertCircle, Search, FileText, BookOpen, UserCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PageType } from "@/lib/types"
import { useWorkspaceFeatures } from "@/lib/hooks/use-workspace-features"
import type { WorkspaceFeatureKey } from "@/lib/types/workspace-features"
import { GettingStartedChecklist } from "@/components/onboarding/getting-started-checklist"

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { currentUser, currentPage, setCurrentPage, currentOrganization } = useApp()
  const { isFeatureEnabled } = useWorkspaceFeatures()

  const handleNavigation = (page: PageType) => {
    setCurrentPage(page)
    onNavigate?.()
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"
  const teamToolsUrl = currentOrganization?.settings?.teamToolsUrl

  // Nav items with required features
  const navItems: {
    id: PageType
    label: string
    icon: typeof LayoutDashboard
    requiredFeature?: WorkspaceFeatureKey
  }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar", icon: Calendar, requiredFeature: "core.meetings" },
    { id: "history", label: "EOD History", icon: History, requiredFeature: "core.eodReports" },
    { id: "rocks", label: "Rock Progress", icon: Target, requiredFeature: "core.rocks" },
    { id: "tasks", label: "Tasks", icon: CheckSquare, requiredFeature: "core.tasks" },
    { id: "manager", label: "My Team", icon: UsersRound, requiredFeature: "advanced.managerDashboard" },
    { id: "org-chart", label: "Org Chart", icon: Network, requiredFeature: "core.orgChart" },
    { id: "ids-board", label: "IDS Board", icon: Search, requiredFeature: "core.ids" },
    { id: "notes", label: "Notes", icon: FileText, requiredFeature: "core.notes" },
    { id: "vto", label: "V/TO", icon: BookOpen, requiredFeature: "core.vto" },
    { id: "people-analyzer", label: "People Analyzer", icon: UserCheck, requiredFeature: "core.peopleAnalyzer" },
  ]

  const adminItems: {
    id: PageType
    label: string
    icon: typeof Shield
    requiredFeature?: WorkspaceFeatureKey
  }[] = [
    { id: "command-center", label: "AI Command Center", icon: Zap, requiredFeature: "advanced.aiCommandCenter" },
    { id: "scorecard", label: "Scorecard", icon: BarChart3, requiredFeature: "core.scorecard" },
    { id: "analytics", label: "Team Analytics", icon: TableProperties, requiredFeature: "advanced.analytics" },
    { id: "admin", label: "Admin Dashboard", icon: Shield },
    { id: "admin-team", label: "Team Management", icon: Users, requiredFeature: "admin.teamManagement" },
    { id: "admin-database", label: "Database Management", icon: Database, requiredFeature: "admin.databaseManagement" },
  ]

  // Filter nav items based on enabled features
  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiredFeature) return true
    return isFeatureEnabled(item.requiredFeature)
  })

  const filteredAdminItems = adminItems.filter((item) => {
    if (!item.requiredFeature) return true
    return isFeatureEnabled(item.requiredFeature)
  })

  // Check if all features are disabled
  const hasAnyFeatures = filteredNavItems.length > 0 || (isAdmin && filteredAdminItems.length > 0)

  return (
    <nav className="flex flex-col h-full py-4">
      <div className="flex-1 space-y-6">
        {/* Empty state when all features disabled */}
        {!hasAnyFeatures && (
          <div className="px-6 py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1 font-medium">No Features Available</p>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Enable features in workspace settings"
                : "Contact your workspace admin"}
            </p>
          </div>
        )}

        {/* Main Navigation */}
        {filteredNavItems.length > 0 && (
          <div className="px-3">
            <h2 className="mb-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Main
            </h2>
            <div className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Team Tools - External Link */}
        {teamToolsUrl && (
          <div className="px-3">
            <h2 className="mb-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Resources
            </h2>
            <a
              href={teamToolsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onNavigate?.()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <ExternalLink className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <span className="truncate">Team Tools</span>
            </a>
          </div>
        )}

        {/* Admin Section */}
        {isAdmin && filteredAdminItems.length > 0 && (
          <div className="px-3">
            <h2 className="mb-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Admin
            </h2>
            <div className="space-y-1">
              {filteredAdminItems.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap",
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-white" : "text-slate-400")} />
                    <span className="truncate">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Onboarding checklist + Settings at bottom */}
      <div className="mt-auto space-y-0">
        <GettingStartedChecklist onNavigate={(page) => handleNavigation(page)} />
      <div className="px-3 pt-2 border-t border-slate-100">
        <button
          onClick={() => handleNavigation("settings")}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            currentPage === "settings"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Settings className={cn("h-4 w-4", currentPage === "settings" ? "text-white" : "text-slate-400")} />
          Settings
        </button>
      </div>
      </div>
    </nav>
  )
}
