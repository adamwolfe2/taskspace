"use client"

import { AppProvider, useApp } from "@/lib/contexts/app-context"
import { useTeamData } from "@/lib/hooks/use-team-data"
import { Header } from "@/components/layout/header"
import { SidebarNav } from "@/components/layout/sidebar-nav"
import { MobileNav } from "@/components/layout/mobile-nav"
import { LoginPage } from "@/components/auth/login-page"
import { RegisterPage } from "@/components/auth/register-page"
import { ForgotPasswordPage } from "@/components/auth/forgot-password-page"
import { ResetPasswordPage } from "@/components/auth/reset-password-page"
import { AcceptInvitationPage } from "@/components/auth/accept-invitation-page"
import { DashboardPage } from "@/components/pages/dashboard-page"
import { HistoryPage } from "@/components/pages/history-page"
import { RocksPage } from "@/components/pages/rocks-page"
import { AdminPage } from "@/components/pages/admin-page"
import { AdminTeamPage } from "@/components/pages/admin-team-page"
import { TasksPage } from "@/components/pages/tasks-page"
import { SettingsPage } from "@/components/pages/settings-page"
import { CommandCenterPage } from "@/components/pages/command-center-page"
import { AnalyticsPage } from "@/components/pages/analytics-page"
import { CalendarPage } from "@/components/pages/calendar-page"
import { ManagerDashboardPage } from "@/components/pages/manager-dashboard-page"
import { ScorecardPage } from "@/components/pages/scorecard-page"
import { OrgChartPage } from "@/components/pages/org-chart-page"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/toaster"
import { CommandPalette } from "@/components/shared/command-palette"
import { DemoModeBanner } from "@/components/shared/demo-mode-banner"
import { Loader2 } from "lucide-react"
import {
  DashboardSkeleton,
  HistoryPageSkeleton,
  TasksPageSkeleton,
  RocksPageSkeleton,
} from "@/components/dashboard/skeletons"

function AppContent() {
  const { currentUser, currentPage, setCurrentPage, isLoading, isAuthenticated, currentOrganization } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const teamData = useTeamData()

  // Check for invitation token or reset token in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const invite = params.get("invite")
      const reset = params.get("resetToken")
      if (invite) {
        setInviteToken(invite)
      }
      if (reset) {
        setResetToken(reset)
        setCurrentPage("reset-password")
      }
    }
  }, [setCurrentPage])

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

  // Handle password reset with token
  if (resetToken && !isAuthenticated) {
    return <ResetPasswordPage token={resetToken} />
  }

  // Auth pages
  if (!isAuthenticated) {
    switch (currentPage) {
      case "register":
        return <RegisterPage />
      case "forgot-password":
        return <ForgotPasswordPage />
      case "reset-password":
        return resetToken ? <ResetPasswordPage token={resetToken} /> : <ForgotPasswordPage />
      case "login":
      default:
        return <LoginPage />
    }
  }

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "owner"

  const renderPage = () => {
    // Show skeletons while data is loading
    if (teamData.isLoading) {
      switch (currentPage) {
        case "dashboard":
          return <DashboardSkeleton />
        case "history":
          return <HistoryPageSkeleton />
        case "rocks":
          return <RocksPageSkeleton />
        case "tasks":
          return <TasksPageSkeleton />
        default:
          return <DashboardSkeleton />
      }
    }

    const dashboardProps = {
      currentUser: currentUser!,
      rocks: teamData.rocks,
      eodReports: teamData.eodReports,
      assignedTasks: teamData.assignedTasks,
      updateRock: teamData.updateRock,
      submitEODReport: teamData.submitEODReport,
      updateTask: teamData.updateTask,
      createTask: teamData.createTask,
      deleteTask: teamData.deleteTask,
      onRefresh: teamData.refresh,
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
            organization={currentOrganization ? {
              id: currentOrganization.id,
              name: currentOrganization.name,
              slug: currentOrganization.slug,
              settings: currentOrganization.settings
            } : undefined}
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
      case "command-center":
        return isAdmin ? (
          <CommandCenterPage
            teamMembers={teamData.teamMembers}
            currentUser={currentUser!}
          />
        ) : (
          <DashboardPage {...dashboardProps} />
        )
      case "analytics":
        return isAdmin ? (
          <AnalyticsPage
            teamMembers={teamData.teamMembers}
            eodReports={teamData.eodReports}
            rocks={teamData.rocks}
            assignedTasks={teamData.assignedTasks}
          />
        ) : (
          <DashboardPage {...dashboardProps} />
        )
      case "scorecard":
        return isAdmin ? (
          <ScorecardPage />
        ) : (
          <DashboardPage {...dashboardProps} />
        )
      case "manager":
        return <ManagerDashboardPage currentUser={currentUser!} />
      case "calendar":
        return (
          <CalendarPage
            currentUser={currentUser!}
            assignedTasks={teamData.assignedTasks}
            rocks={teamData.rocks}
            eodReports={teamData.eodReports}
          />
        )
      case "settings":
        return <SettingsPage />
      case "org-chart":
        return <OrgChartPage />
      default:
        return <DashboardPage {...dashboardProps} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <DemoModeBanner />

      <div className="flex">
        <aside data-sidebar="desktop" className="hidden md:block w-64 border-r border-border min-h-[calc(100vh-4rem)] bg-card">
          <SidebarNav />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent data-sidebar="mobile" side="left" className="p-0 w-64">
            <SheetTitle className="sr-only hidden">Navigation Menu</SheetTitle>
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 min-w-0">
          <div className="max-w-6xl mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>

      <MobileNav />
      <Toaster />
      <CommandPalette />
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
