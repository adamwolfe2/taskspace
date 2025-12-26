"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import type { TeamMember, Organization, PageType } from "../types"
import { api } from "../api/client"

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

  // Theme
  darkMode: boolean
  setDarkMode: (dark: boolean) => void

  // Auth actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, organizationName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  enterDemoMode: () => void

  // Error state
  error: string | null
  clearError: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

// Demo data
const DEMO_USER: TeamMember = {
  id: "demo-user-1",
  name: "Adam Wolfe",
  email: "adam@demo.com",
  role: "admin",
  department: "Operations",
  joinDate: "2024-01-15",
  status: "active",
}

const DEMO_ORG: Organization = {
  id: "demo-org-1",
  name: "Modern Amenities Group",
  slug: "mag-demo",
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  ownerId: "demo-user-1",
  settings: {
    timezone: "America/New_York",
    weekStartDay: 1,
    eodReminderTime: "17:00",
    enableEmailNotifications: true,
    enableSlackIntegration: false,
  },
  subscription: {
    plan: "professional",
    status: "active",
    currentPeriodEnd: "2025-12-31",
    maxUsers: 25,
    features: ["ai-insights", "slack-integration", "email-notifications"],
  },
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null)
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [currentPage, setCurrentPage] = useState<PageType>("login")
  const [darkMode, setDarkMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAuthenticated = !!currentUser && !!currentOrganization

  const clearError = useCallback(() => setError(null), [])

  const refreshSession = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await api.auth.getSession()

      if (data.teamMember && data.organization) {
        setCurrentUser(data.teamMember)
        setCurrentOrganization(data.organization)
        setCurrentPage("dashboard")
      } else {
        setCurrentUser(null)
        setCurrentOrganization(null)
        setCurrentPage("login")
      }
    } catch (err) {
      // Session doesn't exist or expired - that's ok
      setCurrentUser(null)
      setCurrentOrganization(null)
      setCurrentPage("login")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await api.auth.login(email, password)

      if (data.needsOrganization) {
        // User needs to create an organization or accept an invitation
        setCurrentPage("setup-organization")
        return
      }

      // Build team member from response
      const teamMember: TeamMember = {
        id: data.user.id,
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
      setCurrentPage("dashboard")
    } catch (err: any) {
      setError(err.message || "Login failed")
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string, organizationName?: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await api.auth.register(email, password, name, organizationName)

      if (data.organization && data.member) {
        const teamMember: TeamMember = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.member.role,
          department: data.member.department,
          avatar: data.user.avatar,
          joinDate: data.member.joinedAt,
          status: data.member.status,
        }

        setCurrentUser(teamMember)
        setCurrentOrganization(data.organization)
        setCurrentPage("dashboard")
      } else {
        // User created but no organization - go to setup
        setCurrentPage("setup-organization")
      }
    } catch (err: any) {
      setError(err.message || "Registration failed")
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
    } catch (err) {
      // Ignore logout errors
    } finally {
      setCurrentUser(null)
      setCurrentOrganization(null)
      setIsDemoMode(false)
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

  // Persist dark mode preference
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode")
    if (savedDarkMode) {
      setDarkMode(savedDarkMode === "true")
    }
  }, [])

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode))
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

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
        darkMode,
        setDarkMode,
        login,
        register,
        logout,
        refreshSession,
        enterDemoMode,
        error,
        clearError,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
