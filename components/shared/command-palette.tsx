"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
  Zap,
  Loader2,
  User,
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

interface SearchResult {
  id: string
  type: "task" | "rock" | "member"
  title: string
  subtitle?: string
  status?: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [showQuickTask, setShowQuickTask] = useState(false)
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (search.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`, {
          headers: { "X-Requested-With": "XMLHttpRequest" },
        })
        const data = await res.json()
        if (data.success && data.data) {
          setSearchResults(data.data)
        }
      } catch {
        // Search failed silently
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

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

  const handleQuickCreate = useCallback(() => {
    setOpen(false)
    setTimeout(() => setShowQuickTask(true), 100)
  }, [])

  const handleSearchResultClick = useCallback((result: SearchResult) => {
    setOpen(false)
    switch (result.type) {
      case "task":
        setCurrentPage("tasks")
        break
      case "rock":
        setCurrentPage("rocks")
        break
      case "member":
        setCurrentPage("admin-team")
        break
    }
  }, [setCurrentPage])

  const isAdmin = currentUser?.role === "owner" || currentUser?.role === "admin"

  // Show "Create task" option when search text doesn't look like a command
  const showCreateOption = search.length >= 3

  const hasSearchResults = searchResults.length > 0
  const taskResults = searchResults.filter(r => r.type === "task")
  const rockResults = searchResults.filter(r => r.type === "rock")
  const memberResults = searchResults.filter(r => r.type === "member")

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
      id: "ids-board",
      name: "Go to IDS Board",
      description: "Identify, discuss, and solve issues",
      icon: <Search className="mr-2 h-4 w-4" />,
      action: () => navigateTo("ids-board"),
      keywords: ["issues", "identify", "discuss", "solve", "ids"],
      group: "Navigation",
    },
    {
      id: "notes",
      name: "Go to Notes",
      description: "Shared workspace notes",
      icon: <FileText className="mr-2 h-4 w-4" />,
      action: () => navigateTo("notes"),
      keywords: ["notes", "documents", "wiki", "workspace"],
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

  const getStatusBadge = (status?: string) => {
    if (!status) return null
    const colors: Record<string, string> = {
      pending: "bg-amber-100 text-amber-700",
      "in-progress": "bg-blue-100 text-blue-700",
      completed: "bg-emerald-100 text-emerald-700",
      "on-track": "bg-emerald-100 text-emerald-700",
      "at-risk": "bg-amber-100 text-amber-700",
      blocked: "bg-red-100 text-red-700",
    }
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[status] || "bg-slate-100 text-slate-600"}`}>
        {status.replace("-", " ")}
      </span>
    )
  }

  if (!currentUser) return null

  return (
    <>
      {/* Hidden button that can be clicked to open - useful for mobile */}
      <button
        onClick={() => setOpen(true)}
        className="hidden"
        aria-label="Open command palette"
      />

      <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSearch(""); setSearchResults([]) } }}>
        <CommandInput placeholder="Search tasks, rocks, people or type a command..." value={search} onValueChange={setSearch} />
        <CommandList>
          <CommandEmpty>
            {isSearching ? (
              <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : search.length >= 3 ? (
              <button
                className="flex items-center gap-2 w-full px-2 py-3 text-sm text-left hover:bg-accent rounded-md cursor-pointer"
                onClick={handleQuickCreate}
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span>Create task: <strong>{search}</strong></span>
              </button>
            ) : (
              "No results found."
            )}
          </CommandEmpty>

          {/* Live search results */}
          {taskResults.length > 0 && (
            <CommandGroup heading="Tasks">
              {taskResults.map((result) => (
                <CommandItem
                  key={`task-${result.id}`}
                  onSelect={() => handleSearchResultClick(result)}
                >
                  <CheckSquare className="mr-2 h-4 w-4 text-slate-400" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{result.title}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {rockResults.length > 0 && (
            <CommandGroup heading="Rocks">
              {rockResults.map((result) => (
                <CommandItem
                  key={`rock-${result.id}`}
                  onSelect={() => handleSearchResultClick(result)}
                >
                  <Target className="mr-2 h-4 w-4 text-slate-400" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{result.title}</span>
                      {getStatusBadge(result.status)}
                    </div>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {memberResults.length > 0 && (
            <CommandGroup heading="People">
              {memberResults.map((result) => (
                <CommandItem
                  key={`member-${result.id}`}
                  onSelect={() => handleSearchResultClick(result)}
                >
                  <User className="mr-2 h-4 w-4 text-slate-400" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{result.title}</span>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground truncate">{result.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {hasSearchResults && <CommandSeparator />}

          {showCreateOption && (
            <CommandGroup heading="Quick Create">
              <CommandItem onSelect={handleQuickCreate}>
                <Plus className="mr-2 h-4 w-4" />
                <div className="flex flex-col">
                  <span>Create task: {search}</span>
                  <span className="text-xs text-muted-foreground">Open quick task dialog</span>
                </div>
              </CommandItem>
            </CommandGroup>
          )}

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
          userId={currentUser.userId || currentUser.id}
        />
      )}
    </>
  )
}
