"use client"

import { useApp } from "@/lib/contexts/app-context"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, History, Target, Shield, Users, CheckSquare, Settings, Zap, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PageType } from "@/lib/types"

interface SidebarNavProps {
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { currentUser, currentPage, setCurrentPage } = useApp()

  const handleNavigation = (page: PageType) => {
    setCurrentPage(page)
    onNavigate?.()
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  const navItems: { id: PageType; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "history", label: "EOD History", icon: History },
    { id: "rocks", label: "Rock Progress", icon: Target },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
  ]

  const adminItems: { id: PageType; label: string; icon: typeof Shield }[] = [
    { id: "command-center", label: "AI Command Center", icon: Zap },
    { id: "analytics", label: "Team Analytics", icon: BarChart3 },
    { id: "admin", label: "Admin Dashboard", icon: Shield },
    { id: "admin-team", label: "Team Management", icon: Users },
  ]

  return (
    <nav className="flex flex-col h-full py-4">
      <div className="flex-1">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation
          </h2>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "secondary" : "ghost"}
                className={cn("w-full justify-start", currentPage === item.id && "bg-secondary")}
                onClick={() => handleNavigation(item.id)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {isAdmin && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Admin
            </h2>
            <div className="space-y-1">
              {adminItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentPage === item.id ? "secondary" : "ghost"}
                  className={cn("w-full justify-start", currentPage === item.id && "bg-secondary")}
                  onClick={() => handleNavigation(item.id)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 mt-auto border-t border-border">
        <Button
          variant={currentPage === "settings" ? "secondary" : "ghost"}
          className={cn("w-full justify-start", currentPage === "settings" && "bg-secondary")}
          onClick={() => handleNavigation("settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>
    </nav>
  )
}
