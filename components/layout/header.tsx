"use client"

import { useApp } from "@/lib/contexts/app-context"
import { UserInitials } from "@/components/shared/user-initials"
import { NotificationCenter } from "@/components/shared/notification-center"
import { DemoModeIndicator } from "@/components/shared/demo-mode-banner"
import { OrganizationSwitcher } from "@/components/shared/organization-switcher"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, Menu, Settings, Building, Search, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { currentUser, currentOrganization, logout, setCurrentPage } = useApp()

  const handleLogout = async () => {
    await logout()
  }

  if (!currentUser) return null

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case "owner":
        return <Badge className="bg-amber-100 text-amber-700 border-0 font-medium text-[10px] px-1.5 py-0.5">Owner</Badge>
      case "admin":
        return <Badge className="bg-blue-100 text-blue-700 border-0 font-medium text-[10px] px-1.5 py-0.5">Admin</Badge>
      default:
        return null
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-40 w-full overflow-hidden">
      <div className="flex items-center justify-between h-14 sm:h-16 px-2 sm:px-4 md:px-6">
        {/* Left side - Organization & Workspace switchers */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-shrink overflow-hidden">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-600 h-10 w-10 min-h-[44px] min-w-[44px] flex-shrink-0"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {/* Mobile organization switcher */}
          <div className="md:hidden min-w-0 flex-shrink overflow-hidden">
            <OrganizationSwitcher compact />
          </div>
          {/* Desktop organization switcher */}
          <div className="hidden md:block">
            <OrganizationSwitcher />
          </div>

        </div>

        {/* Right side */}
        <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
          {/* Demo mode indicator */}
          <DemoModeIndicator />

          {/* Search button */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-slate-500 hover:text-slate-700 border-slate-200 hover:border-slate-300 bg-slate-50/50"
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              })
              document.dispatchEvent(event)
            }}
          >
            <Search className="h-4 w-4" />
            <span className="text-sm">Search...</span>
            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] font-medium text-slate-400">
              <span>⌘</span>K
            </kbd>
          </Button>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10 min-h-[44px] min-w-[44px] text-slate-600"
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              })
              document.dispatchEvent(event)
            }}
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-1 sm:gap-2 hover:bg-slate-100 px-1.5 sm:px-2 h-10 min-h-[44px]"
              >
                <UserInitials name={currentUser.name} size="sm" />
                <span className="hidden md:inline text-sm font-medium text-slate-700 max-w-[100px] truncate">
                  {currentUser.name}
                </span>
                <ChevronDown className="hidden md:inline h-4 w-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white shadow-lg border-slate-200">
              <DropdownMenuLabel className="text-slate-400 text-xs font-medium">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <div className="px-3 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-900">{currentUser.name}</span>
                  {getRoleBadge()}
                </div>
                <span className="text-sm text-slate-500">{currentUser.email}</span>
                {currentOrganization && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500">
                    <Building className="h-3.5 w-3.5" />
                    {currentOrganization.name}
                  </div>
                )}
              </div>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={() => setCurrentPage("settings")}
                className="cursor-pointer text-slate-700 hover:bg-slate-50"
              >
                <Settings className="mr-2 h-4 w-4 text-slate-400" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
