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
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-40 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-1">
        {primaryItems.map((item) => {
          const isActive = currentPage === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "flex-col h-14 gap-0.5 flex-1 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setCurrentPage(item.id)}
            >
              <div className="relative">
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
                {/* Add indicator dot when active */}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </Button>
          )
        })}

        {/* More menu trigger */}
        <Sheet open={moreSheetOpen} onOpenChange={setMoreSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "flex-col h-14 gap-0.5 flex-1 rounded-xl transition-all duration-200",
                isMoreActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "scale-110")} />
                {isMoreActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isMoreActive && "font-semibold")}>
                More
              </span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl">
            <SheetHeader className="pb-4">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 pb-6">
              {filteredSecondaryItems.map((item) => {
                const isActive = currentPage === item.id
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                      "flex-col h-20 gap-2 rounded-2xl border transition-all duration-200",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                    onClick={() => handleNavigation(item.id)}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {item.label}
                    </span>
                  </Button>
                )
              })}
            </div>

            {/* Quick actions */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Quick Actions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
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

      {/* Safe area padding for devices with home indicators */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  )
}
