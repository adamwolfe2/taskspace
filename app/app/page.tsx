"use client"

import type { PageType } from "@/lib/types"
import { AppProvider, useApp } from "@/lib/contexts/app-context"
import { useTeamData } from "@/lib/hooks/use-team-data"
import { useWorkspaces } from "@/lib/hooks/use-workspace"
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
import { AdminDatabasePage } from "@/components/pages/admin-database-page"
import { TasksPage } from "@/components/pages/tasks-page"
import { SettingsPage } from "@/components/pages/settings-page"
import { CommandCenterPage } from "@/components/pages/command-center-page"
import { AnalyticsPage } from "@/components/pages/analytics-page"
import { CalendarPage } from "@/components/pages/calendar-page"
import { ManagerDashboardPage } from "@/components/pages/manager-dashboard-page"
import { ScorecardPage } from "@/components/pages/scorecard-page"
import { OrgChartPage } from "@/components/pages/org-chart-page"
import { IdsBoardPage } from "@/components/pages/ids-board-page"
import { NotesPage } from "@/components/pages/notes-page"
import { VTOPage } from "@/components/pages/vto-page"
import { PeopleAnalyzerPage } from "@/components/pages/people-analyzer-page"
import { SetupOrganizationPage } from "@/components/pages/setup-organization-page"
import { InvitedUserWelcome } from "@/components/onboarding/invited-user-welcome"
import { BrandThemeProvider } from "@/lib/contexts/brand-theme-context"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/toaster"
import { CommandPalette } from "@/components/shared/command-palette"
import { initGlobalErrorHandler } from "@/lib/api/client"
import { DemoModeBanner } from "@/components/shared/demo-mode-banner"
import { EmailVerificationBanner } from "@/components/shared/email-verification-banner"
import { TrialBanner } from "@/components/billing/trial-banner"
import { Loader2 } from "lucide-react"
import {
  DashboardSkeleton,
  HistoryPageSkeleton,
  TasksPageSkeleton,
  RocksPageSkeleton,
} from "@/components/dashboard/skeletons"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { KeyboardShortcutsDialog, useKeyboardShortcuts } from "@/components/shared/keyboard-shortcuts-dialog"

function AppContent() {
  const { currentUser, currentPage, setCurrentPage, isLoading, isAuthenticated, currentOrganization, pageFilter, clearPageFilter } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  // CRITICAL: Call useWorkspaces() at the top level to trigger workspace auto-selection
  // BEFORE useTeamData tries to fetch. Without this, workspace selection only happens
  // inside WorkspaceSwitcher (in Header), which may not run soon enough.
  useWorkspaces()
  const teamData = useTeamData()
  const [showQuickTask, setShowQuickTask] = useState(false)

  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    { key: "d", meta: true, shift: true, handler: () => setCurrentPage("dashboard") },
    { key: "t", meta: true, shift: true, handler: () => setCurrentPage("tasks") },
    { key: "r", meta: true, shift: true, handler: () => setCurrentPage("rocks") },
    { key: "h", meta: true, shift: true, handler: () => setCurrentPage("history") },
    { key: "s", meta: true, shift: true, handler: () => setCurrentPage("settings") },
    { key: "m", meta: true, shift: true, handler: () => setCurrentPage("calendar") },
    { key: "i", meta: true, shift: true, handler: () => setCurrentPage("ids-board") },
  ])

  // Initialize global error handler for unhandled promise rejections
  useEffect(() => {
    const cleanup = initGlobalErrorHandler()
    return cleanup
  }, [])

  // Check for invitation token, reset token, verify email token, or page parameter in URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const invite = params.get("invite")
      const reset = params.get("resetToken")
      const verifyEmail = params.get("verifyEmail")
      const page = params.get("page")

      if (invite) {
        setInviteToken(invite)
      }
      if (reset) {
        setResetToken(reset)
        setCurrentPage("reset-password")
      }
      if (verifyEmail) {
        // Call verify-email API and show result
        fetch(`/api/auth/verify-email?token=${encodeURIComponent(verifyEmail)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              // Clean URL and refresh to pick up verified state
              window.history.replaceState({}, "", window.location.pathname)
              window.location.reload()
            }
          })
          .catch(() => {
            // Silently fail - user can resend from banner
          })
      }
      if (page && !isAuthenticated) {
        setCurrentPage(page as PageType)
      }
    }
  }, [setCurrentPage, isAuthenticated])

  // Show loading spinner while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Handle invitation acceptance (works for both new and existing users)
  if (inviteToken) {
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
      case "setup-organization":
        return <SetupOrganizationPage mode="create" />
      case "login":
      default:
        return <LoginPage />
    }
  }

  // Welcome page for invited users (full-screen, no sidebar/header)
  if (currentPage === "welcome") {
    return <InvitedUserWelcome />
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
        return (
          <HistoryPage
            {...teamData}
            currentUser={currentUser!}
            initialUserFilter={pageFilter?.userId}
            onFilterConsumed={clearPageFilter}
          />
        )
      case "rocks":
        return (
          <RocksPage
            {...teamData}
            currentUser={currentUser!}
            initialOwnerFilter={pageFilter?.userId}
            onFilterConsumed={clearPageFilter}
          />
        )
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
            initialAssigneeFilter={pageFilter?.userId}
            filterUserName={pageFilter?.userName}
            onFilterConsumed={clearPageFilter}
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
      case "admin-database":
        return isAdmin ? (
          <AdminDatabasePage />
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
          <AnalyticsPage />
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
      case "ids-board":
        return <IdsBoardPage />
      case "notes":
        return <NotesPage />
      case "vto":
        return <VTOPage />
      case "people-analyzer":
        return <PeopleAnalyzerPage />
      default:
        return <DashboardPage {...dashboardProps} />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip navigation link for accessibility - only visible when focused */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      <Header onMenuClick={() => setSidebarOpen(true)} />
      <DemoModeBanner />
      <EmailVerificationBanner />
      <TrialBanner />

      <div className="flex">
        <aside
          data-sidebar="desktop"
          className="hidden md:block w-64 border-r border-border min-h-[calc(100vh-4rem)] bg-card"
          aria-label="Main navigation"
        >
          <SidebarNav />
        </aside>

        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent data-sidebar="mobile" side="left" className="p-0 w-64">
            <SheetTitle className="sr-only hidden">Navigation Menu</SheetTitle>
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </SheetContent>
        </Sheet>

        <main
          id="main-content"
          className="flex-1 p-4 md:p-6 pb-24 md:pb-6 min-w-0"
          role="main"
          aria-label="Main content"
        >
          <div className="max-w-6xl mx-auto">
            <ErrorBoundary
              title="Something went wrong"
              description="An error occurred while loading this page. Please try refreshing."
              showRetry
            >
              {renderPage()}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <MobileNav />
      <Toaster />
      <CommandPalette />
      <KeyboardShortcutsDialog />
    </div>
  )
}

export default function Page() {
  return (
    <AppProvider>
      <BrandThemeProvider>
        <AppContent />
      </BrandThemeProvider>
    </AppProvider>
  )
}
