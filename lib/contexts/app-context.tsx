"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { TeamMember, Organization, PageType } from "../types"
import { api } from "../api/client"
import { getErrorMessage } from "../utils"
import posthog from "posthog-js"

// Filter state passed between pages during navigation (e.g., manager drill-down)
export interface PageFilter {
  userId?: string   // Filter target pages by this user ID
  userName?: string // Display name for the filtered user
}

interface AppContextType {
  // Auth state
  currentUser: TeamMember | null
  setCurrentUser: (user: TeamMember | null) => void
  currentOrganization: Organization | null
  setCurrentOrganization: (org: Organization | null) => void
  isAuthenticated: boolean
  isLoading: boolean
  isDemoMode: boolean

  // Page navigation
  currentPage: PageType
  setCurrentPage: (page: PageType) => void

  // Cross-page filter state (consumed once by target page, then cleared)
  pageFilter: PageFilter | null
  navigateWithFilter: (page: PageType, filter: PageFilter) => void
  clearPageFilter: () => void

  // Auth actions
  login: (email: string, password: string) => Promise<{ pendingTwoFactor?: true; userId?: string } | void>
  verify2FA: (userId: string, code: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  enterDemoMode: () => void

  // Email verification
  emailVerified: boolean

  // Super admin
  isSuperAdmin: boolean

  // Error state
  error: string | null
  clearError: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Demo data
const DEMO_USER: TeamMember = {
  id: "demo-user-1",
  userId: "demo-user-1",
  name: "Adam Wolfe",
  email: "adam@apple.com",
  role: "admin",
  department: "Product Engineering",
  jobTitle: "VP Product Engineering",
  joinDate: "2023-06-15",
  status: "active",
  managerId: null,
}

const DEMO_ORG: Organization = {
  id: "demo-org-1",
  name: "Apple",
  slug: "apple-demo",
  createdAt: "2023-01-01",
  updatedAt: "2023-01-01",
  ownerId: "demo-user-1",
  logoUrl: "/integrations/apple logo.png",
  settings: {
    timezone: "America/Los_Angeles",
    weekStartDay: 1,
    eodReminderTime: "17:00",
    enableEmailNotifications: true,
    enableSlackIntegration: false,
  },
  subscription: {
    plan: "business",
    status: "active",
    // Demo mode never expires - set far in the future
    currentPeriodEnd: "2099-12-31",
    maxUsers: 999,
    features: ["ai-insights", "slack-integration", "email-notifications"],
  },
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null)
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageType>("login")
  const [pageFilter, setPageFilter] = useState<PageFilter | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailVerified, setEmailVerified] = useState(true) // Default true to avoid flash
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const isAuthenticated = !!currentUser && !!currentOrganization

  const clearError = useCallback(() => setError(null), [])

  const navigateWithFilter = useCallback((page: PageType, filter: PageFilter) => {
    setPageFilter(filter)
    setCurrentPage(page)
  }, [])

  const clearPageFilter = useCallback(() => setPageFilter(null), [])

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.auth.getSession()

      if (data.user && data.member && data.organization) {
        const teamMember: TeamMember = {
          id: data.member.id,
          userId: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.member.role,
          department: data.member.department,
          avatar: data.user.avatar,
          joinDate: data.member.joinedAt,
          weeklyMeasurable: data.member.weeklyMeasurable,
          status: data.member.status,
        }
        setCurrentUser(teamMember)
        setCurrentOrganization(data.organization)
        setEmailVerified(data.user?.emailVerified ?? true)
        setIsSuperAdmin((data as unknown as Record<string, unknown>).isSuperAdmin === true)
        setCurrentPage("dashboard")
      } else if (data.user && (data as unknown as Record<string, unknown>).needsOrganization) {
        // User is authenticated but has no org - go to onboarding
        const partialUser: TeamMember = {
          id: data.user.id || "",
          userId: data.user.id || "",
          name: data.user.name || "",
          email: data.user.email || "",
          role: "owner",
          department: "",
          joinDate: new Date().toISOString(),
          status: "active",
        }
        setCurrentUser(partialUser)
        setCurrentOrganization(null)
        setCurrentPage("setup-organization")
      } else {
        setCurrentUser(null)
        setCurrentOrganization(null)
        setCurrentPage("login")
      }
    } catch {
      // Session doesn't exist or expired - that's ok
      setCurrentUser(null)
      setCurrentOrganization(null)
      setCurrentPage("login")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ pendingTwoFactor?: true; userId?: string } | void> => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await api.auth.login(email, password)

      // Handle 2FA pending response
      if ("pendingTwoFactor" in data && data.pendingTwoFactor) {
        return { pendingTwoFactor: true, userId: data.userId }
      }

      // At this point, data is guaranteed to be AuthResponse
      const authData = data as import("../types").AuthResponse

      if (!authData.user || !authData.organization || !authData.member) {
        // User needs to create an organization - store user info for onboarding wizard
        const partialUser: TeamMember = {
          id: authData.user?.id || "",
          userId: authData.user?.id || "",
          name: authData.user?.name || "",
          email: authData.user?.email || email,
          role: "owner",
          department: "",
          joinDate: new Date().toISOString(),
          status: "active",
        }
        setCurrentUser(partialUser)
        setCurrentPage("setup-organization")
        return
      }

      // Build team member from response
      const teamMember: TeamMember = {
        id: authData.member.id,
        userId: authData.user.id,
        name: authData.user.name,
        email: authData.user.email,
        role: authData.member.role,
        department: authData.member.department,
        avatar: authData.user.avatar,
        joinDate: authData.member.joinedAt,
        weeklyMeasurable: authData.member.weeklyMeasurable,
        status: authData.member.status,
      }

      setCurrentUser(teamMember)
      setCurrentOrganization(authData.organization)
      setEmailVerified(authData.user?.emailVerified ?? true)
      setIsSuperAdmin(authData.user?.isSuperAdmin ?? false)
      setCurrentPage("dashboard")
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Login failed"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const verify2FA = useCallback(async (userId: string, code: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await api.auth.verify2FA(userId, code)

      if (!data.user || !data.organization || !data.member) {
        const partialUser: TeamMember = {
          id: data.user?.id || "",
          userId: data.user?.id || "",
          name: data.user?.name || "",
          email: data.user?.email || "",
          role: "owner",
          department: "",
          joinDate: new Date().toISOString(),
          status: "active",
        }
        setCurrentUser(partialUser)
        setCurrentPage("setup-organization")
        return
      }

      const teamMember: TeamMember = {
        id: data.member.id,
        userId: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.member.role,
        department: data.member.department,
        avatar: data.user.avatar,
        joinDate: data.member.joinedAt,
        weeklyMeasurable: data.member.weeklyMeasurable,
        status: data.member.status,
      }

      setCurrentUser(teamMember)
      setCurrentOrganization(data.organization)
      setEmailVerified(data.user?.emailVerified ?? true)
      setIsSuperAdmin(data.user?.isSuperAdmin ?? false)
      setCurrentPage("dashboard")
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Verification failed"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await api.auth.register(email, password, name)

      // Store user info for onboarding wizard
      const partialUser: TeamMember = {
        id: data.user?.id || "",
        userId: data.user?.id || "",
        name: data.user?.name || name,
        email: data.user?.email || email,
        role: "owner",
        department: "",
        joinDate: new Date().toISOString(),
        status: "active",
      }
      setCurrentUser(partialUser)

      // Always go to onboarding wizard to set up organization with branding
      setCurrentPage("setup-organization")
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Registration failed"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (!isDemoMode) {
        await api.auth.logout()
      }
    } catch {
      // Ignore logout errors
    } finally {
      setCurrentUser(null)
      setCurrentOrganization(null)
      setIsDemoMode(false)
      setIsSuperAdmin(false)
      setCurrentPage("login")
    }
  }, [isDemoMode])

  const enterDemoMode = useCallback(() => {
    setCurrentUser(DEMO_USER)
    setCurrentOrganization(DEMO_ORG)
    setIsDemoMode(true)
    setCurrentPage("dashboard")
    setIsLoading(false)
  }, [])

  // Check session on mount
  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  // Identify user in PostHog on login; reset on logout
  useEffect(() => {
    if (currentUser && !isDemoMode && currentUser.userId) {
      posthog.identify(currentUser.userId, {
        email: currentUser.email,
        name: currentUser.name,
        role: currentUser.role,
        department: currentUser.department,
      })
    } else if (!currentUser) {
      posthog.reset()
    }
  }, [currentUser, isDemoMode])

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentOrganization,
        setCurrentOrganization,
        isAuthenticated,
        isLoading,
        isDemoMode,
        currentPage,
        setCurrentPage,
        pageFilter,
        navigateWithFilter,
        clearPageFilter,
        login,
        verify2FA,
        register,
        logout,
        refreshSession,
        enterDemoMode,
        emailVerified,
        isSuperAdmin,
        error,
        clearError,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// Safe defaults when no AppProvider is present (e.g. public pages, error boundaries)
const noopAsync = async () => {}
const noop = () => {}

const defaultAppContext: AppContextType = {
  currentUser: null,
  setCurrentUser: noop,
  currentOrganization: null,
  setCurrentOrganization: noop,
  isAuthenticated: false,
  isLoading: false,
  isDemoMode: false,
  currentPage: "login",
  setCurrentPage: noop,
  pageFilter: null,
  navigateWithFilter: noop,
  clearPageFilter: noop,
  login: noopAsync,
  verify2FA: noopAsync,
  register: noopAsync,
  logout: noopAsync,
  refreshSession: noopAsync,
  enterDemoMode: noop,
  emailVerified: false,
  isSuperAdmin: false,
  error: null,
  clearError: noop,
}

export function useApp() {
  const context = useContext(AppContext)
  // Return safe defaults instead of crashing when used outside the provider
  // (public EOD pages, marketing pages, error boundaries, etc.)
  return context ?? defaultAppContext
}
