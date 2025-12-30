"use client"

import { useApp } from "@/lib/contexts/app-context"
import type { PageType } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { LayoutDashboard, History, Target, Shield, CheckSquare, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const { currentUser, currentPage, setCurrentPage } = useApp()

  const navItems: { id: PageType; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Home", icon: LayoutDashboard },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "tasks", label: "Tasks", icon: CheckSquare },
    { id: "rocks", label: "Rocks", icon: Target },
  ]

  if (currentUser?.role === "admin" || currentUser?.role === "owner") {
    navItems.push({ id: "admin", label: "Admin", icon: Shield })
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={cn("flex-col h-full gap-1 flex-1", currentPage === item.id && "text-primary")}
            onClick={() => setCurrentPage(item.id)}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs">{item.label}</span>
          </Button>
        ))}
      </div>
    </nav>
  )
}
