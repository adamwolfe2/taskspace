"use client"

import { useState, useEffect, useCallback } from "react"
import { useApp } from "@/lib/contexts/app-context"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  History,
  Target,
  CheckSquare,
  Users,
  Settings,
  BarChart3,
  Sparkles,
  FileText,
  Plus,
  Search,
  LogOut,
  Moon,
  Sun,
  Bell,
  Zap,
} from "lucide-react"
import type { PageType } from "@/lib/types"
import { QuickTaskDialog } from "./quick-task-dialog"

interface CommandItem {
  id: string
  name: string
  description?: string
  icon: React.ReactNode
  action: () => void
  keywords?: string[]
  group: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [showQuickTask, setShowQuickTask] = useState(false)
  const { setCurrentPage, currentUser, logout, darkMode, setDarkMode } = useApp()

  // Listen for keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      // Also support Escape to close
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const navigateTo = useCallback((page: PageType) => {
    setCurrentPage(page)
    setOpen(false)
  }, [setCurrentPage])

  const handleLogout = useCallback(async () => {
    setOpen(false)
    await logout()
  }, [logout])

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!darkMode)
    setOpen(false)
  }, [darkMode, setDarkMode])

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin"

  // Define all available commands
  const commands: CommandItem[] = [
    // Navigation
    {
      id: "dashboard",
      name: "Go to Dashboard",
      description: "View your daily overview",
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      action: () => navigateTo("dashboard"),
      keywords: ["home", "overview", "main"],
      group: "Navigation",
    },
    {
      id: "rocks",
      name: "Go to Rocks",
      description: "Manage quarterly goals",
      icon: <Target className="mr-2 h-4 w-4" />,
      action: () => navigateTo("rocks"),
      keywords: ["goals", "objectives", "okr", "quarterly"],
      group: "Navigation",
    },
    {
      id: "tasks",
      name: "Go to Tasks",
      description: "View and manage tasks",
      icon: <CheckSquare className="mr-2 h-4 w-4" />,
      action: () => navigateTo("tasks"),
      keywords: ["todo", "assignments"],
      group: "Navigation",
    },
    {
      id: "history",
      name: "Go to EOD History",
      description: "View past EOD reports",
      icon: <History className="mr-2 h-4 w-4" />,
      action: () => navigateTo("history"),
      keywords: ["reports", "past", "archive"],
      group: "Navigation",
    },
    {
      id: "analytics",
      name: "Go to Analytics",
      description: "View team analytics",
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      action: () => navigateTo("analytics"),
      keywords: ["charts", "metrics", "data", "insights"],
      group: "Navigation",
    },
    {
      id: "command-center",
      name: "Go to AI Command Center",
      description: "AI-powered tools and insights",
      icon: <Sparkles className="mr-2 h-4 w-4" />,
      action: () => navigateTo("command-center"),
      keywords: ["ai", "assistant", "brain dump", "copilot"],
      group: "Navigation",
    },
    {
      id: "settings",
      name: "Go to Settings",
      description: "Configure your account",
      icon: <Settings className="mr-2 h-4 w-4" />,
      action: () => navigateTo("settings"),
      keywords: ["preferences", "account", "config"],
      group: "Navigation",
    },

    // Admin Navigation
    ...(isAdmin ? [
      {
        id: "admin",
        name: "Go to Admin Dashboard",
        description: "Team oversight and management",
        icon: <Users className="mr-2 h-4 w-4" />,
        action: () => navigateTo("admin"),
        keywords: ["team", "management", "oversight"],
        group: "Admin",
      },
      {
        id: "admin-team",
        name: "Go to Team Management",
        description: "Manage team members",
        icon: <Users className="mr-2 h-4 w-4" />,
        action: () => navigateTo("admin-team"),
        keywords: ["members", "invite", "roles"],
        group: "Admin",
      },
    ] : []),

    // Actions
    {
      id: "quick-task",
      name: "Quick Add Task",
      description: "Rapidly create a new personal task",
      icon: <Zap className="mr-2 h-4 w-4" />,
      action: () => {
        setOpen(false)
        setTimeout(() => setShowQuickTask(true), 100)
      },
      keywords: ["new", "create", "add", "todo", "task"],
      group: "Actions",
    },
    {
      id: "toggle-dark",
      name: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode",
      description: "Toggle dark/light theme",
      icon: darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />,
      action: toggleDarkMode,
      keywords: ["theme", "appearance", "color"],
      group: "Actions",
    },
    {
      id: "logout",
      name: "Sign Out",
      description: "Log out of your account",
      icon: <LogOut className="mr-2 h-4 w-4" />,
      action: handleLogout,
      keywords: ["exit", "logout", "leave"],
      group: "Actions",
    },
  ]

  // Group commands
  const navigationCommands = commands.filter(c => c.group === "Navigation")
  const adminCommands = commands.filter(c => c.group === "Admin")
  const actionCommands = commands.filter(c => c.group === "Actions")

  if (!currentUser) return null

  return (
    <>
      {/* Hidden button that can be clicked to open - useful for mobile */}
      <button
        onClick={() => setOpen(true)}
        className="hidden"
        aria-label="Open command palette"
      />

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            {navigationCommands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                onSelect={cmd.action}
                keywords={cmd.keywords}
              >
                {cmd.icon}
                <div className="flex flex-col">
                  <span>{cmd.name}</span>
                  {cmd.description && (
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          {adminCommands.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Admin">
                {adminCommands.map((cmd) => (
                  <CommandItem
                    key={cmd.id}
                    onSelect={cmd.action}
                    keywords={cmd.keywords}
                  >
                    {cmd.icon}
                    <div className="flex flex-col">
                      <span>{cmd.name}</span>
                      {cmd.description && (
                        <span className="text-xs text-muted-foreground">{cmd.description}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Actions">
            {actionCommands.map((cmd) => (
              <CommandItem
                key={cmd.id}
                onSelect={cmd.action}
                keywords={cmd.keywords}
              >
                {cmd.icon}
                <div className="flex flex-col">
                  <span>{cmd.name}</span>
                  {cmd.description && (
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Quick Task Dialog */}
      {currentUser && (
        <QuickTaskDialog
          open={showQuickTask}
          onOpenChange={setShowQuickTask}
          userId={currentUser.id}
        />
      )}
    </>
  )
}
