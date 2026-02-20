"use client"

import { useState } from "react"
import { useApp } from "@/lib/contexts/app-context"
import type { PageType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  LayoutDashboard,
  History,
  Target,
  Shield,
  CheckSquare,
  Calendar,
  MoreHorizontal,
  Settings,
  BarChart3,
  Sparkles,
  Users,
  Search,
  FileText,
  Network,
  BookOpen,
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const { currentUser, currentPage, setCurrentPage } = useApp()
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  // Primary nav items (always visible in bottom bar)
  const primaryItems: { id: PageType; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "rocks", label: "Rocks", icon: Target },
  ]

  // Secondary nav items (in "More" menu)
  const secondaryItems: { id: PageType; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
    { id: "history", label: "EOD History", icon: History },
    { id: "ids-board", label: "IDS Board", icon: Search },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "org-chart", label: "Org Chart", icon: Network },
    { id: "vto", label: "V/TO", icon: BookOpen },
    { id: "people-analyzer", label: "People", icon: UserCheck },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "admin", label: "Team Dashboard", icon: Shield, adminOnly: true },
    { id: "admin-team", label: "Team Members", icon: Users, adminOnly: true },
    { id: "analytics", label: "Analytics", icon: BarChart3, adminOnly: true },
    { id: "command-center", label: "AI Command Center", icon: Sparkles, adminOnly: true },
  ]

  const filteredSecondaryItems = secondaryItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  const handleNavigation = (pageId: PageType) => {
    setCurrentPage(pageId)
    setMoreSheetOpen(false)
  }

  const isMoreActive = filteredSecondaryItems.some((item) => item.id === currentPage)

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {primaryItems.map((item) => {
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-w-0 h-14 gap-1 rounded-xl transition-all duration-200 active:scale-95",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
              onClick={() => setCurrentPage(item.id)}
            >
              <div className="relative">
                <item.icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn(
                "text-[10px] leading-tight truncate max-w-full px-1",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          )
        })}

        {/* More menu trigger */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="More options"
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-w-0 h-14 gap-1 rounded-xl transition-all duration-200 active:scale-95",
                isMoreActive
                  ? "text-red-600 bg-red-50"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <div className="relative">
                <MoreHorizontal className={cn("h-6 w-6", isMoreActive && "scale-110")} />
                {isMoreActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn(
                "text-[10px] leading-tight",
                isMoreActive ? "font-semibold" : "font-medium"
              )}>
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl px-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
          >
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left">More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 pb-6">
              {filteredSecondaryItems.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <button
                    key={item.id}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center h-20 gap-2 rounded-lg border transition-all duration-200 active:scale-95",
                      isActive
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    )}
                    onClick={() => handleNavigation(item.id)}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center leading-tight px-1">
                      {item.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Quick actions */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                Quick Actions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 h-10"
                  onClick={() => {
                    setMoreSheetOpen(false)
                    // Trigger command palette
                    const event = new KeyboardEvent("keydown", {
                      key: "k",
                      metaKey: true,
                      bubbles: true,
                    })
                    document.dispatchEvent(event)
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Command Palette
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
