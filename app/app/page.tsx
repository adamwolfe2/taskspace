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
import { DemoRestricted } from "@/components/shared/demo-restricted"
import { HistoryPage } from "@/components/pages/history-page"
import { RocksPage } from "@/components/pages/rocks-page"
import { TasksPage } from "@/components/pages/tasks-page"
import { SettingsPage } from "@/components/pages/settings-page"
import { CalendarPage } from "@/components/pages/calendar-page"
import { ScorecardPage } from "@/components/pages/scorecard-page"
import { IdsBoardPage } from "@/components/pages/ids-board-page"
import { SetupOrganizationPage } from "@/components/pages/setup-organization-page"
import dynamic from "next/dynamic"
import { InvitedUserWelcome } from "@/components/onboarding/invited-user-welcome"
import { BrandThemeProvider } from "@/lib/contexts/brand-theme-context"
import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/toaster"
import { CommandPalette } from "@/components/shared/command-palette"
import { QuickTaskDialog } from "@/components/shared/quick-task-dialog"
import { initGlobalErrorHandler } from "@/lib/api/client"
import { DemoModeBanner } from "@/components/shared/demo-mode-banner"
import { EmailVerificationBanner } from "@/components/shared/email-verification-banner"
import { TrialBanner } from "@/components/billing/trial-banner"
import {
  DashboardSkeleton,
  HistoryPageSkeleton,
  TasksPageSkeleton,
  RocksPageSkeleton,
} from "@/components/dashboard/skeletons"

// Dynamic imports — heavy libs + admin-only + secondary pages
const AnalyticsPage = dynamic(
  () => import("@/components/pages/analytics-page").then(mod => ({ default: mod.AnalyticsPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const NotesPage = dynamic(
  () => import("@/components/pages/notes-page").then(mod => ({ default: mod.NotesPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const OrgChartPage = dynamic(
  () => import("@/components/pages/org-chart-page").then(mod => ({ default: mod.OrgChartPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const AdminPage = dynamic(
  () => import("@/components/pages/admin-page").then(mod => ({ default: mod.AdminPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const AdminTeamPage = dynamic(
  () => import("@/components/pages/admin-team-page").then(mod => ({ default: mod.AdminTeamPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const AdminDatabasePage = dynamic(
  () => import("@/components/pages/admin-database-page").then(mod => ({ default: mod.AdminDatabasePage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const AdminApiPage = dynamic(
  () => import("@/components/pages/admin-api-page").then(mod => ({ default: mod.AdminApiPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const CommandCenterPage = dynamic(
  () => import("@/components/pages/command-center-page").then(mod => ({ default: mod.CommandCenterPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const PeopleAnalyzerPage = dynamic(
  () => import("@/components/pages/people-analyzer-page").then(mod => ({ default: mod.PeopleAnalyzerPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const VTOPage = dynamic(
  () => import("@/components/pages/vto-page").then(mod => ({ default: mod.VTOPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const ManagerDashboardPage = dynamic(
  () => import("@/components/pages/manager-dashboard-page").then(mod => ({ default: mod.ManagerDashboardPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const ProjectsPage = dynamic(
  () => import("@/components/pages/projects-page").then(mod => ({ default: mod.ProjectsPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const ClientsPage = dynamic(
  () => import("@/components/pages/clients-page").then(mod => ({ default: mod.ClientsPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const PortfolioPage = dynamic(
  () => import("@/components/pages/portfolio-page").then(mod => ({ default: mod.PortfolioPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)
const PortfolioDetailPage = dynamic(
  () => import("@/components/pages/portfolio-detail-page").then(mod => ({ default: mod.PortfolioDetailPage })),
  { ssr: false, loading: () => <DashboardSkeleton /> }
)

import { Loader2, Plus } from "lucide-react"
import { ErrorBoundary } from "@/components/shared/error-boundary"
import { KeyboardShortcutsDialog, useKeyboardShortcuts } from "@/components/shared/keyboard-shortcuts-dialog"
import { OfflineIndicator } from "@/components/shared/offline-indicator"
import { SessionTimeoutWarning } from "@/components/shared/session-timeout-warning"
import { BugReporter } from "@/components/shared/bug-reporter"

function AppContent() {
  const { currentUser, currentPage, setCurrentPage, isLoading, isAuthenticated, currentOrganization, pageFilter, clearPageFilter, isSuperAdmin, isDemoMode, enterDemoMode } = useApp()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [showMobileQuickTask, setShowMobileQuickTask] = useState(false)
  // CRITICAL: Call useWorkspaces() at the top level to trigger workspace auto-selection
  // BEFORE useTeamData tries to fetch. Without this, workspace selection only happens
  // inside WorkspaceSwitcher (in Header), which may not run soon enough.
  useWorkspaces()
  const teamData = useTeamData()
  // Register global keyboard shortcuts
  useKeyboardShortcuts([
    { key: "d", meta: true, shift: true, handler: () => setCurrentPage("dashboard") },
    { key: "t", meta: true, shift: true, handler: () => setCurrentPage("tasks") },
    { key: "g", meta: true, shift: true, handler: () => setCurrentPage("rocks") },
    { key: "h", meta: true, shift: true, handler: () => setCurrentPage("history") },
    { key: "s", meta: true, shift: true, handler: () => setCurrentPage("settings") },
    { key: "m", meta: true, shift: true, handler: () => setCurrentPage("calendar") },
    { key: "i", meta: true, shift: true, handler: () => setCurrentPage("ids-board") },
    { key: "n", meta: true, handler: () => setShowMobileQuickTask(true) },
    { key: "e", meta: true, handler: () => {
      // Scroll to EOD section on dashboard
      setCurrentPage("dashboard")
      setTimeout(() => {
        document.querySelector("[data-eod-section]")?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }},
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
      const demo = params.get("demo")

      // Clear sensitive tokens from URL immediately to prevent exposure in browser history
      if (invite || reset || verifyEmail || page || demo) {
        window.history.replaceState({}, "", window.location.pathname)
      }

      // Auto-enter demo mode via URL param (e.g. /app?demo=true)
      if (demo === "true" && !isAuthenticated && !isDemoMode) {
        enterDemoMode()
        return
      }

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
              window.location.reload()
            }
          })
          .catch(() => {
            // Silently fail - user can resend from banner
          })
      }
      if (page) {
        // Only apply page param for unauthenticated users who aren't still loading
        // (prevents ?page=register from overriding a valid session during load)
        if (!isAuthenticated && !isLoading) {
          setCurrentPage(page as PageType)
        }
      }
    }
  }, [setCurrentPage, isAuthenticated, isLoading, isDemoMode, enterDemoMode])

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
            updateRock={teamData.updateRock}
          />
        )
      case "tasks":
        return (
          <TasksPage
            currentUser={currentUser!}
            assignedTasks={teamData.assignedTasks}
            setAssignedTasks={teamData.setAssignedTasks}
            rocks={teamData.rocks}
            projects={teamData.projects}
            createTask={teamData.createTask}
            updateTask={teamData.updateTask}
            deleteTask={teamData.deleteTask}
            initialAssigneeFilter={pageFilter?.userId}
            filterUserName={pageFilter?.userName}
            onFilterConsumed={clearPageFilter}
          />
        )
      case "admin":
        if (isDemoMode) return <DemoRestricted featureName="Admin Dashboard" />
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
        if (isDemoMode) return <DemoRestricted featureName="Team Management" />
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
        if (isDemoMode) return <DemoRestricted featureName="Database Management" />
        return isAdmin ? (
          <AdminDatabasePage />
        ) : (
          <DashboardPage {...dashboardProps} />
        )
      case "admin-api":
        if (isDemoMode) return <DemoRestricted featureName="API Management" />
        return isAdmin ? (
          <AdminApiPage />
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
        if (isDemoMode) return <DemoRestricted featureName="Settings" />
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
      case "projects":
        return (
          <ProjectsPage
            currentUser={currentUser!}
            teamMembers={teamData.teamMembers}
            projects={teamData.projects}
            clients={teamData.clients}
            rocks={teamData.rocks}
            assignedTasks={teamData.assignedTasks}
            createProject={teamData.createProject}
            updateProject={teamData.updateProject}
            deleteProject={teamData.deleteProject}
          />
        )
      case "clients":
        return (
          <ClientsPage
            currentUser={currentUser!}
            clients={teamData.clients}
            projects={teamData.projects}
            createClient={teamData.createClient}
            updateClient={teamData.updateClient}
            deleteClient={teamData.deleteClient}
          />
        )
      case "portfolio":
        return isSuperAdmin ? <PortfolioPage /> : <DashboardPage {...dashboardProps} />
      case "portfolio-detail":
        return isSuperAdmin ? <PortfolioDetailPage /> : <DashboardPage {...dashboardProps} />
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
      <OfflineIndicator />
      <SessionTimeoutWarning />

      <div className="flex">
        <aside
          data-sidebar="desktop"
          className="hidden md:block md:w-52 lg:w-64 border-r border-border min-h-[calc(100vh-4rem)] bg-card"
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
              key={currentPage}
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
      {/* Mobile floating quick task button */}
      {currentUser && (
        <>
          <button
            onClick={() => setShowMobileQuickTask(true)}
            className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center md:hidden"
            aria-label="Add new task"
          >
            <Plus className="h-6 w-6" />
          </button>
          <QuickTaskDialog
            open={showMobileQuickTask}
            onOpenChange={setShowMobileQuickTask}
            userId={currentUser.userId || currentUser.id}
          />
        </>
      )}
      <Toaster />
      <CommandPalette />
      <KeyboardShortcutsDialog />
      <BugReporter />
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
