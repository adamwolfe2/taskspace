"use client"

import { AppProvider, useApp } from "@/lib/contexts/app-context"
import { useTeamData } from "@/lib/hooks/use-team-data"
import { Header } from "@/components/layout/header"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { LoginPage } from "@/components/auth/login-page"
import { RegisterPage } from "@/components/auth/register-page"
import { AcceptInvitationPage } from "@/components/auth/accept-invitation-page"
import { DashboardPage } from "@/components/pages/dashboard-page"
import { HistoryPage } from "@/components/pages/history-page"
import { RocksPage } from "@/components/pages/rocks-page"
import { AdminPage } from "@/components/pages/admin-page"
import { AdminTeamPage } from "@/components/pages/admin-team-page"
import { TasksPage } from "@/components/pages/tasks-page"
import { SettingsPage } from "@/components/pages/settings-page"
import { useState, useEffect } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/toaster"
import { Loader2 } from "lucide-react"

function AppContent() {
  const { currentUser, currentPage, isLoading, isAuthenticated } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const teamData = useTeamData()

  // Check for invitation token in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const token = params.get("invite")
      if (token) {
        setInviteToken(token)
      }
    }
  }, [])

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Handle invitation acceptance
  if (inviteToken && !isAuthenticated) {
    return <AcceptInvitationPage token={inviteToken} />
  }

  // Auth pages
  if (!isAuthenticated) {
    switch (currentPage) {
      case "register":
        return <RegisterPage />
      case "login":
      default:
        return <LoginPage />
    }
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  const renderPage = () => {
    const dashboardProps = {
      currentUser: currentUser!,
      rocks: teamData.rocks,
      eodReports: teamData.eodReports,
      assignedTasks: teamData.assignedTasks,
      updateRock: teamData.updateRock,
      submitEODReport: teamData.submitEODReport,
      updateTask: teamData.updateTask,
    }

    switch (currentPage) {
      case "dashboard":
        return <DashboardPage {...dashboardProps} />
      case "history":
        return <HistoryPage {...teamData} currentUser={currentUser!} />
      case "rocks":
        return <RocksPage {...teamData} currentUser={currentUser!} />
      case "tasks":
        return (
          <TasksPage
            currentUser={currentUser!}
            assignedTasks={teamData.assignedTasks}
            setAssignedTasks={teamData.setAssignedTasks}
            rocks={teamData.rocks}
            createTask={teamData.createTask}
            updateTask={teamData.updateTask}
            deleteTask={teamData.deleteTask}
          />
        )
      case "admin":
        return isAdmin ? (
          <AdminPage
            teamMembers={teamData.teamMembers}
            eodReports={teamData.eodReports}
            rocks={teamData.rocks}
            currentUser={currentUser!}
            assignedTasks={teamData.assignedTasks}
            setAssignedTasks={teamData.setAssignedTasks}
          />
        ) : (
          <DashboardPage {...dashboardProps} />
        )
      case "admin-team":
        return isAdmin ? (
          <AdminTeamPage
            teamMembers={teamData.teamMembers}
            setTeamMembers={teamData.setTeamMembers}
            rocks={teamData.rocks}
            setRocks={teamData.setRocks}
          />
        ) : (
          <DashboardPage {...dashboardProps} />
        )
      case "settings":
        return <SettingsPage />
      default:
        return <DashboardPage {...dashboardProps} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} />

      <div className="flex">
        <aside className="hidden md:block w-64 border-r border-border min-h-[calc(100vh-4rem)] bg-card">
          <SidebarNav />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{renderPage()}</main>
      </div>

      <MobileNav />
      <Toaster />
    </div>
  )
}

export default function Page() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
