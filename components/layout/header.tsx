"use client"

import { useApp } from "@/lib/contexts/app-context"
import { UserInitials } from "@/components/shared/user-initials"
import { NotificationCenter } from "@/components/shared/notification-center"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Moon, Sun, LogOut, Menu, Settings, Building, Search } from "lucide-react"
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
  const { currentUser, currentOrganization, logout, setCurrentPage, darkMode, setDarkMode } = useApp()

  const handleLogout = async () => {
    await logout()
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  if (!currentUser) return null

  const getRoleBadge = () => {
    switch (currentUser.role) {
      case "owner":
        return <Badge className="bg-amber-500 text-white">Owner</Badge>
      case "admin":
        return <Badge variant="default">Admin</Badge>
      default:
        return null
    }
  }

  return (
    <header className="border-b border-border bg-card sticky top-0 z-40">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">
              {currentOrganization?.name || "Team Dashboard"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Command Palette Trigger */}
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              // Trigger Cmd+K programmatically
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              })
              document.dispatchEvent(event)
            }}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Search...</span>
            <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <NotificationCenter />

          <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <UserInitials name={currentUser.name} size="sm" />
                <span className="hidden md:inline">{currentUser.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{currentUser.name}</span>
                  {getRoleBadge()}
                </div>
                <span className="text-xs text-muted-foreground">{currentUser.email}</span>
                {currentOrganization && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Building className="h-3 w-3" />
                    {currentOrganization.name}
                  </div>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setCurrentPage("settings")}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
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
