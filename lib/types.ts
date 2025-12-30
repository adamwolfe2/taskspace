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
  asanaIntegration?: AsanaIntegrationSettings
}

export interface AsanaIntegrationSettings {
  enabled: boolean
  projectGid: string
  projectName: string
  workspaceGid: string
  workspaceName: string
  userMappings: AsanaUserMapping[]
  syncTasks: boolean
  syncRocks: boolean
  lastSyncAt: string | null
}

export interface AsanaUserMapping {
  aimsUserId: string
  aimsUserEmail: string
  aimsUserName: string
  asanaUserGid: string
  asanaUserEmail: string
  asanaUserName: string
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
  userId: string | null // null for pending/draft members
  email: string // Store email for draft members before they have a user account
  name: string // Store name for draft members
  role: "owner" | "admin" | "member"
  department: string
  weeklyMeasurable?: string
  joinedAt: string
  invitedBy?: string
  status: "active" | "invited" | "pending" | "inactive" // pending = draft (not yet invited)
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
  status?: "active" | "invited" | "pending" | "inactive" // pending = draft (not yet invited)
}

// Rock Milestone (sub-goals within a rock)
export interface RockMilestone {
  id: string
  text: string
  completed: boolean
  completedAt?: string
  dueDate?: string
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
  doneWhen?: string[] // Legacy field
  milestones?: RockMilestone[] // New structured milestones
  quarter?: string // e.g., "Q1 2025"
}

// Task Comment
export interface TaskComment {
  id: string
  userId: string
  userName: string
  text: string
  createdAt: string
}

// Task Recurrence
export interface TaskRecurrence {
  type: "daily" | "weekly" | "monthly"
  interval: number // every N days/weeks/months
  daysOfWeek?: number[] // 0=Sunday, 1=Monday, etc. for weekly
  dayOfMonth?: number // 1-31 for monthly
  endDate?: string // Optional end date
  lastGenerated?: string // Last date a task was generated
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
  source?: "manual" | "asana"
  comments?: TaskComment[]
  recurrence?: TaskRecurrence
  parentRecurringTaskId?: string // Links to the original recurring task template
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
  | "calendar"
  | "history"
  | "rocks"
  | "tasks"
  | "admin"
  | "admin-team"
  | "admin-tasks"
  | "command-center"
  | "analytics"
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

// ============================================
// AI COMMAND CENTER TYPES
// ============================================

// Admin brain dump for AI processing
export interface AdminBrainDump {
  id: string
  organizationId: string
  adminId: string
  content: string
  processedAt?: string
  tasksGenerated: number
  status: "pending" | "processing" | "completed" | "failed"
  createdAt: string
}

// AI-extracted insights from EOD reports
export interface EODInsight {
  id: string
  organizationId: string
  eodReportId: string
  completedItems: Array<{
    text: string
    category?: string
    rockId?: string
  }>
  blockers: Array<{
    text: string
    severity: "low" | "medium" | "high"
    suggestedAction?: string
    relatedTo?: string
  }>
  sentiment: "positive" | "neutral" | "negative" | "stressed"
  sentimentScore: number // 1-100
  categories: string[]
  highlights: string[]
  aiSummary: string
  followUpQuestions: string[]
  processedAt: string
}

// AI-generated task pending approval
export interface AIGeneratedTask {
  id: string
  organizationId: string
  brainDumpId?: string
  assigneeId: string
  assigneeName?: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: string
  context: string // Why this task was generated
  status: "pending_approval" | "approved" | "rejected" | "converted"
  approvedBy?: string
  approvedAt?: string
  convertedTaskId?: string
  pushedToSlack: boolean
  pushedAt?: string
  createdAt: string
}

// Daily digest for team summary
export interface DailyDigest {
  id: string
  organizationId: string
  digestDate: string
  summary: string
  wins: Array<{
    text: string
    memberName: string
    memberId: string
  }>
  blockers: Array<{
    text: string
    memberName: string
    memberId: string
    severity: "low" | "medium" | "high"
    daysOpen?: number
  }>
  concerns: Array<{
    text: string
    type: "workload" | "sentiment" | "deadline" | "pattern"
  }>
  followUps: Array<{
    text: string
    targetMemberId: string
    targetMemberName: string
    priority: "low" | "medium" | "high"
  }>
  challengeQuestions: string[]
  teamSentiment: "positive" | "neutral" | "negative" | "mixed"
  reportsAnalyzed: number
  generatedAt: string
}

// AI conversation for copilot
export interface AIConversation {
  id: string
  organizationId: string
  userId: string
  query: string
  response?: string
  contextUsed?: Record<string, unknown>
  createdAt: string
}

// Extended team member with AI fields
export interface TeamMemberExtended extends TeamMember {
  skills?: string[]
  capacity?: number // 0-100 percentage
  activeProjects?: string[]
  slackUserId?: string
}

// AI Task Generation Request
export interface AITaskGenerationRequest {
  brainDump: string
  teamMembers: TeamMember[]
  currentTasks?: AssignedTask[]
  rocks?: Rock[]
}

// AI Task Generation Response
export interface AITaskGenerationResponse {
  tasks: Omit<AIGeneratedTask, "id" | "organizationId" | "brainDumpId" | "createdAt" | "status" | "pushedToSlack">[]
  summary: string
  warnings?: string[]
}

// EOD Parse Request
export interface EODParseRequest {
  eodReport: EODReport
  memberName: string
  memberDepartment: string
  rocks?: Rock[]
}

// EOD Parse Response
export interface EODParseResponse {
  insight: Omit<EODInsight, "id" | "organizationId" | "eodReportId" | "processedAt">
  alertAdmin: boolean
  alertReason?: string
}

// Digest Generation Request
export interface DigestGenerationRequest {
  eodReports: EODReport[]
  insights: EODInsight[]
  teamMembers: TeamMember[]
  rocks: Rock[]
  previousDigest?: DailyDigest
}

// AI Query Request
export interface AIQueryRequest {
  query: string
  context?: {
    eodReports?: EODReport[]
    tasks?: AssignedTask[]
    rocks?: Rock[]
    teamMembers?: TeamMember[]
  }
}

// AI Query Response
export interface AIQueryResponse {
  response: string
  data?: unknown
  suggestedFollowUps?: string[]
}

// API Key for external integrations (MCP, Claude Desktop, etc.)
export interface ApiKey {
  id: string
  organizationId: string
  createdBy: string
  name: string
  key: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
}
