"use client"

import { useApp } from "@/lib/contexts/app-context"
import { LayoutDashboard, History, Target, Shield, Users, CheckSquare, Settings, Zap, BarChart3, Calendar, UsersRound, TableProperties, ExternalLink, Network } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PageType } from "@/lib/types"

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { currentUser, currentPage, setCurrentPage, currentOrganization } = useApp()

  const handleNavigation = (page: PageType) => {
    setCurrentPage(page)
    onNavigate?.()
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"
  const teamToolsUrl = currentOrganization?.settings?.teamToolsUrl

  const navItems: { id: PageType; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "history", label: "EOD History", icon: History },
    { id: "rocks", label: "Rock Progress", icon: Target },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "manager", label: "My Team", icon: UsersRound },
  ]

  const adminItems: { id: PageType; label: string; icon: typeof Shield }[] = [
    { id: "org-chart", label: "Org Chart", icon: Network },
    { id: "command-center", label: "AI Command Center", icon: Zap },
    { id: "scorecard", label: "Weekly Scorecard", icon: TableProperties },
    { id: "analytics", label: "Team Analytics", icon: BarChart3 },
    { id: "admin", label: "Admin Dashboard", icon: Shield },
    { id: "admin-team", label: "Team Management", icon: Users },
  ]

  return (
    <nav className="flex flex-col h-full py-4">
      <div className="flex-1 space-y-6">
        {/* Main Navigation */}
        <div className="px-3">
          <h2 className="mb-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Main
          </h2>
          <div className="space-y-1">
              {navItems.map((item) => {
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
        {isAdmin && (
          <div className="px-3">
            <h2 className="mb-3 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Admin
            </h2>
            <div className="space-y-1">
                {adminItems.map((item) => {
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

      {/* Settings at bottom */}
      <div className="px-3 pt-4 mt-auto border-t border-slate-100">
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
    </nav>
  )
}
