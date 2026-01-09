"use client"

import { useApp } from "@/lib/contexts/app-context"
import { UserInitials } from "@/components/shared/user-initials"
import { NotificationCenter } from "@/components/shared/notification-center"
import { DemoModeIndicator } from "@/components/shared/demo-mode-banner"
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

  const orgLogo = currentOrganization?.settings?.customBranding?.logo

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
        {/* Left side - Organization branding */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-600 h-9 w-9 flex-shrink-0"
              onClick={onMenuClick}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          {/* Mobile org name */}
          <div className="md:hidden flex items-center gap-2 min-w-0">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={currentOrganization?.name || "Organization"}
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <Building className="h-4 w-4 text-red-600" />
              </div>
            )}
            <span className="font-semibold text-gray-900 text-sm truncate">
              {currentOrganization?.name || "AIMS"}
            </span>
          </div>
          {/* Desktop org name */}
          <div className="hidden md:flex items-center gap-3">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={currentOrganization?.name || "Organization"}
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <Building className="h-4 w-4 text-red-600" />
              </div>
            )}
            <span className="font-semibold text-gray-900">
              {currentOrganization?.name || "AIMS"}
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Demo mode indicator */}
          <DemoModeIndicator />

          {/* Search button */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-gray-500 hover:text-gray-700 border-gray-200 hover:border-gray-300 bg-gray-50/50"
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
            <kbd className="hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border border-gray-200 bg-white px-1.5 font-mono text-[10px] font-medium text-gray-400">
              <span>⌘</span>K
            </kbd>
          </Button>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 text-gray-600"
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
                className="flex items-center gap-1 sm:gap-2 hover:bg-gray-100 px-1.5 sm:px-2 h-9"
              >
                <UserInitials name={currentUser.name} size="sm" />
                <span className="hidden md:inline text-sm font-medium text-gray-700 max-w-[100px] truncate">
                  {currentUser.name}
                </span>
                <ChevronDown className="hidden md:inline h-4 w-4 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white shadow-lg border-gray-200">
              <DropdownMenuLabel className="text-gray-400 text-xs font-medium">My Account</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              <div className="px-3 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{currentUser.name}</span>
                  {getRoleBadge()}
                </div>
                <span className="text-sm text-gray-500">{currentUser.email}</span>
                {currentOrganization && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                    <Building className="h-3.5 w-3.5" />
                    {currentOrganization.name}
                  </div>
                )}
              </div>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem
                onClick={() => setCurrentPage("settings")}
                className="cursor-pointer text-gray-700 hover:bg-gray-50"
              >
                <Settings className="mr-2 h-4 w-4 text-gray-400" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
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
