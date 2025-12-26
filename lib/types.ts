// Organization/Workspace Types
export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
  ownerId: string
  settings: OrganizationSettings
  subscription: SubscriptionInfo
}

export interface OrganizationSettings {
  timezone: string
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday
  eodReminderTime: string // "17:00" format
  enableEmailNotifications: boolean
  enableSlackIntegration: boolean
  slackWebhookUrl?: string
  customBranding?: {
    logo?: string
    primaryColor?: string
  }
}

export interface SubscriptionInfo {
  plan: "free" | "starter" | "professional" | "enterprise"
  status: "active" | "trialing" | "past_due" | "canceled"
  currentPeriodEnd: string
  maxUsers: number
  features: string[]
}

// User Types
export interface User {
  id: string
  email: string
  passwordHash: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
  emailVerified: boolean
  lastLoginAt?: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: "owner" | "admin" | "member"
  department: string
  weeklyMeasurable?: string
  joinedAt: string
  invitedBy?: string
  status: "active" | "invited" | "inactive"
}

export interface Invitation {
  id: string
  organizationId: string
  email: string
  role: "admin" | "member"
  department: string
  token: string
  expiresAt: string
  createdAt: string
  invitedBy: string
  status: "pending" | "accepted" | "expired"
}

// Password Reset Token
export interface PasswordResetToken {
  id: string
  userId: string
  email: string
  token: string
  expiresAt: string
  createdAt: string
  usedAt?: string
}

// Session Types
export interface Session {
  id: string
  userId: string
  organizationId: string
  token: string
  expiresAt: string
  createdAt: string
  lastActiveAt: string
  userAgent?: string
  ipAddress?: string
}

// Team Member (for UI display - combines User + OrganizationMember)
export interface TeamMember {
  id: string
  name: string
  email: string
  role: "owner" | "admin" | "member"
  department: string
  avatar?: string
  joinDate: string
  weeklyMeasurable?: string
  status?: "active" | "invited" | "inactive"
}

// Rock (Quarterly Goals)
export interface Rock {
  id: string
  organizationId: string
  userId: string
  title: string
  description: string
  progress: number
  dueDate: string
  status: "on-track" | "at-risk" | "blocked" | "completed"
  createdAt: string
  updatedAt: string
  bucket?: string
  outcome?: string
  doneWhen?: string[]
  quarter?: string // e.g., "Q1 2025"
}

// Task Types
export interface Task {
  id: string
  organizationId: string
  userId: string
  title: string
  category: "urgent" | "today" | "upcoming"
  completed: boolean
  dueDate?: string
  createdAt: string
  updatedAt: string
}

export interface AssignedTask {
  id: string
  organizationId: string
  title: string
  description?: string
  assigneeId: string
  assigneeName: string
  assignedById: string | null
  assignedByName: string | null
  type: "assigned" | "personal"
  rockId: string | null
  rockTitle: string | null
  priority: "high" | "medium" | "normal"
  dueDate: string
  createdAt: string
  updatedAt: string
  status: "pending" | "in-progress" | "completed"
  completedAt: string | null
  addedToEOD: boolean
  eodReportId: string | null
}

// EOD Report Types
export interface EODTask {
  id: string
  text: string
  rockId: string | null
  rockTitle: string | null
}

export interface EODPriority {
  id: string
  text: string
  rockId: string | null
  rockTitle: string | null
}

export interface EODReport {
  id: string
  organizationId: string
  userId: string
  date: string
  tasks: EODTask[]
  challenges: string
  tomorrowPriorities: EODPriority[]
  needsEscalation: boolean
  escalationNote: string | null
  submittedAt: string
  createdAt: string
}

// App State Types
export interface AppState {
  currentUser: TeamMember | null
  currentOrganization: Organization | null
  currentPage: PageType
  isLoading: boolean
}

export type PageType =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "setup-organization"
  | "accept-invitation"
  | "dashboard"
  | "history"
  | "rocks"
  | "tasks"
  | "admin"
  | "admin-team"
  | "admin-tasks"
  | "settings"
  | "profile"

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// Auth Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  organizationName?: string
}

export interface AuthResponse {
  user: User
  organization?: Organization
  member?: OrganizationMember
  token: string
  expiresAt: string
}

// Dashboard Stats
export interface DashboardStats {
  totalRocks: number
  completedRocks: number
  averageProgress: number
  pendingTasks: number
  completedTasks: number
  eodSubmittedToday: boolean
  streakDays: number
}

export interface TeamStats {
  totalMembers: number
  eodSubmissionRate: number
  averageRockProgress: number
  escalationsCount: number
  pendingInvitations: number
}

// Notification Types
export interface Notification {
  id: string
  organizationId: string
  userId: string
  type: "task_assigned" | "rock_updated" | "eod_reminder" | "escalation" | "invitation" | "system"
  title: string
  message: string
  read: boolean
  createdAt: string
  actionUrl?: string
  metadata?: Record<string, unknown>
}
