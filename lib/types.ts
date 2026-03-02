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
  // Enhanced branding fields (for productization)
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  customDomain?: string
  faviconUrl?: string
  billingEmail?: string
  // Stripe integration
  stripeCustomerId?: string
  stripeSubscriptionId?: string | null
  // Internal orgs bypass all billing/trial checks
  isInternal?: boolean
}

export interface OrganizationSettings {
  timezone: string
  weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday
  eodReminderTime: string // "17:00" format
  eodEmailDays?: number[] // Days to send EOD emails: 0=Sun,1=Mon...6=Sat. Default [1,2,3,4,5] (weekdays)
  enableEmailNotifications: boolean
  enableSlackIntegration: boolean
  slackWebhookUrl?: string
  teamToolsUrl?: string // External link to team tools page
  customBranding?: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
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
  plan: "free" | "team" | "business"
  status: "active" | "trialing" | "past_due" | "canceled"
  currentPeriodEnd: string | null
  maxUsers: number | null
  features: string[]
  // Additional billing fields
  billingCycle?: "monthly" | "yearly" | null
  cancelAtPeriodEnd?: boolean
  aiCreditsUsed?: number
  trialEnd?: string | null
  paymentFailureCount?: number
  firstFailedAt?: string | null
  lastFailedAt?: string | null
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
  failedLoginAttempts?: number
  lockedAt?: string | null
  lockReason?: string | null
  isSuperAdmin?: boolean
  totpEnabled?: boolean
  totpSecret?: string | null
}

/** User type without password hash or TOTP secret - safe for API responses */
export type SafeUser = Omit<User, "passwordHash" | "totpSecret">

// Notification preferences for each event type
export interface NotificationChannels {
  email: boolean
  inApp: boolean
  slack: boolean
}

export interface NotificationPreferences {
  task_assigned: NotificationChannels
  eod_reminder: NotificationChannels
  escalation: NotificationChannels
  rock_updated: NotificationChannels
  digest: { email: boolean; slack: boolean }
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
  timezone?: string // User's personal timezone (overrides org default)
  eodReminderTime?: string // User's personal reminder time (HH:MM format)
  managerId?: string | null // ID of the user who manages this member
  jobTitle?: string // Job title for display
  notificationPreferences?: NotificationPreferences
  onboardingCompletedAt?: string | null
  onboardingDismissed?: boolean
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
  workspaceId?: string | null
}

/** Invitation type without token - safe for list/admin API responses */
export type SafeInvitation = Omit<Invitation, "token">

// Email Verification Token
export interface EmailVerificationToken {
  id: string
  userId: string
  email: string
  token: string
  expiresAt: string
  createdAt: string
  usedAt?: string
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
  id: string // This is organization_members.id - use for metrics, manager assignments
  userId?: string // This is users.id - use for rocks, tasks, EOD reports
  name: string
  email: string
  role: "owner" | "admin" | "member"
  department: string
  avatar?: string
  joinDate: string
  weeklyMeasurable?: string
  status?: "active" | "invited" | "pending" | "inactive" // pending = draft (not yet invited)
  timezone?: string // User's personal timezone
  eodReminderTime?: string // User's preferred reminder time (HH:MM format)
  managerId?: string | null // ID of the user who manages this member
  jobTitle?: string // Job title for display
  lastActive?: string // Last activity timestamp
  createdAt?: string // Creation timestamp
  notificationPreferences?: NotificationPreferences
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
  workspaceId?: string | null // Multi-workspace support (SESSION 5)
  userId?: string // Optional for draft members who haven't accepted invitation
  ownerEmail?: string // For draft members who haven't accepted invitation
  userName?: string // User name (joined from users table)
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
  projectId?: string | null
  projectName?: string | null
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

// Task Template
export interface TaskTemplate {
  id: string
  organizationId: string
  workspaceId?: string | null
  createdBy: string
  name: string
  title: string
  description?: string
  priority: "high" | "medium" | "normal"
  defaultRockId?: string
  recurrence?: TaskRecurrence
  isShared: boolean
  createdAt: string
}

// Task Types
export interface AssignedTask {
  id: string
  organizationId: string
  workspaceId?: string | null // Multi-workspace support (SESSION 5)
  title: string
  description?: string
  assigneeId: string | null // null for draft/invited members
  assigneeEmail?: string    // set instead of assigneeId for draft members
  assigneeName: string
  assignedById: string | null
  assignedByName: string | null
  type: "assigned" | "personal"
  rockId: string | null
  rockTitle: string | null
  priority: "high" | "medium" | "normal" | "low"
  dueDate: string | null
  createdAt: string
  updatedAt?: string
  status: "pending" | "in-progress" | "completed"
  completedAt?: string | null
  addedToEOD?: boolean
  eodReportId?: string | null
  source?: "manual" | "asana" | "ai_suggestion"
  asanaGid?: string | null // Asana task GID for two-way sync
  comments?: TaskComment[]
  recurrence?: TaskRecurrence
  parentRecurringTaskId?: string // Links to the original recurring task template
  projectId?: string | null
  projectName?: string | null
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

// File attachment for EOD/EOW reports
export interface FileAttachment {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: string
}

export interface EODReport {
  id: string
  organizationId: string
  workspaceId?: string | null // Multi-workspace support (SESSION 5)
  userId: string
  date: string
  tasks: EODTask[]
  challenges: string
  tomorrowPriorities: EODPriority[]
  needsEscalation: boolean
  escalationNote: string | null
  metricValueToday: number | null // Daily metric value for weekly scorecard
  mood?: "positive" | "neutral" | "negative"
  attachments?: FileAttachment[] // Optional file/image attachments
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
  | "welcome"
  | "dashboard"
  | "calendar"
  | "history"
  | "rocks"
  | "tasks"
  | "taskPool"
  | "admin"
  | "admin-team"
  | "admin-database"
  | "admin-api"
  | "command-center"
  | "analytics"
  | "scorecard"
  | "manager"
  | "settings"
  | "org-chart"
  | "ids-board"
  | "projects"
  | "clients"
  | "notes"
  | "vto"
  | "people-analyzer"
  | "portfolio"
  | "portfolio-detail"

// ============================================
// TASK POOL TYPES
// ============================================

export interface TaskPoolItem {
  id: string
  organizationId: string
  workspaceId: string
  title: string
  description?: string | null
  priority: "high" | "medium" | "normal"
  createdById: string
  createdByName: string
  claimedById?: string | null
  claimedByName?: string | null
  claimedAt?: string | null
  claimedDate?: string | null
  isClaimedToday: boolean // computed server-side
  createdAt: string
  updatedAt: string
}

// ============================================
// IDS BOARD TYPES
// ============================================

export type IdsBoardColumn = "identify" | "discuss" | "solve"
export type IdsBoardItemType = "issue" | "rock" | "custom"

export interface IdsBoardItem {
  id: string
  workspaceId: string
  title: string
  description?: string
  columnName: IdsBoardColumn
  orderIndex: number
  itemType: IdsBoardItemType
  linkedId?: string
  createdBy?: string
  createdByName?: string
  assignedTo?: string
  assignedToName?: string
  createdAt: string
  updatedAt: string
}

// Workspace Notes
export interface WorkspaceNote {
  id: string
  workspaceId: string
  content: string
  lastEditedBy: string | null
  createdAt: string
  updatedAt: string
}

// ============================================
// CLIENTS
// ============================================

export interface Client {
  id: string
  organizationId: string
  workspaceId: string
  name: string
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  website?: string
  industry?: string
  status: "active" | "inactive" | "prospect" | "archived"
  notes?: string
  tags: string[]
  customFields: Record<string, unknown>
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Client Portal fields
  portalToken: string | null
  portalEnabled: boolean
  portalMemberFilter: string[] | null // null = all workspace members
  // Computed (from JOINs, not stored)
  projectCount?: number
  activeProjectCount?: number
}

export interface EodComment {
  id: string
  eodReportId: string
  organizationId: string
  clientId: string | null
  authorName: string
  isClient: boolean
  content: string
  createdAt: string
}

// ============================================
// PROJECTS
// ============================================

export interface Project {
  id: string
  organizationId: string
  workspaceId: string
  clientId: string | null
  clientName?: string  // JOIN-populated
  name: string
  description?: string
  status: "planning" | "active" | "on-hold" | "completed" | "cancelled"
  priority: "high" | "medium" | "normal" | "low"
  startDate?: string | null
  dueDate?: string | null
  completedAt?: string | null
  budgetCents?: number | null
  progress: number
  ownerId?: string | null
  ownerName?: string  // JOIN-populated
  tags: string[]
  customFields: Record<string, unknown>
  createdBy?: string
  createdAt: string
  updatedAt: string
  // Computed
  taskCount?: number
  completedTaskCount?: number
  memberCount?: number
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  userName?: string
  userEmail?: string
  role: "owner" | "lead" | "member" | "viewer"
  addedAt: string
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  code?: string // Error code for programmatic handling (e.g., CREDITS_EXHAUSTED)
  meta?: Record<string, unknown> // Additional metadata for debugging or context
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
  user: SafeUser
  organization?: Organization
  member?: OrganizationMember
  token: string
  expiresAt: string
}

export interface TwoFactorPendingResponse {
  pendingTwoFactor: true
  userId: string
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
export type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "rock_updated"
  | "eod_reminder"
  | "escalation"
  | "invitation"
  | "mention"
  | "meeting_starting"
  | "issue_created"
  | "system"

export interface Notification {
  id: string
  organizationId: string
  workspaceId?: string
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
  read: boolean
  readAt?: string
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

// AI Suggestion types for the inbox
export type AISuggestionSourceType = "eod_report" | "brain_dump" | "digest" | "query" | "scheduled"
export type AISuggestionType = "task" | "follow_up" | "blocker" | "alert" | "rock_update"
export type AISuggestionStatus = "pending" | "approved" | "rejected" | "auto_applied" | "expired"
export type AISuggestionPriority = "low" | "medium" | "high" | "urgent"

export interface AISuggestion {
  id: string
  organizationId: string
  sourceType: AISuggestionSourceType
  sourceId?: string
  sourceText?: string
  suggestionType: AISuggestionType
  title: string
  description?: string
  suggestedData: Record<string, unknown>
  context?: string
  confidence: number
  priority: AISuggestionPriority
  targetUserId?: string
  targetUserName?: string
  relatedEntityType?: string
  relatedEntityId?: string
  status: AISuggestionStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewerNotes?: string
  actionTaken?: Record<string, unknown>
  creditsCost: number
  expiresAt?: string
  createdAt: string
  updatedAt: string
}

export interface AIBudgetSettings {
  id: string
  organizationId: string
  monthlyBudgetCredits: number
  warningThresholdPercent: number
  autoApproveEnabled: boolean
  autoApproveMinConfidence: number
  autoApproveTypes: string[]
  pauseOnBudgetExceeded: boolean
  // Legacy fields
  monthlyCreditBudget?: number
  autoApproveMaxCreditsPerDay?: number
  notifyOnNewSuggestions?: boolean
  notifyOnBudgetThreshold?: Record<string, boolean>
  digestFrequency?: "immediate" | "daily" | "weekly" | "never"
  createdAt: string
  updatedAt: string
}

export interface SuggestionStats {
  pending: number
  approvedToday: number
  rejectedToday: number
  autoAppliedToday?: number
  creditsUsedToday?: number
  avgConfidence?: number
  // Legacy aliases
  pendingCount?: number
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

// Parsed Scorecard Metric from brain dump
export interface ParsedScorecardMetric {
  assigneeId: string
  assigneeName: string
  metricName: string
  weeklyGoal: number
}

// AI Task Generation Response
export interface AITaskGenerationResponse {
  tasks: Omit<AIGeneratedTask, "id" | "organizationId" | "brainDumpId" | "createdAt" | "status" | "pushedToSlack">[]
  metrics?: ParsedScorecardMetric[] // Weekly scorecard metrics for team members
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

// Push notification subscription
export interface PushSubscription {
  id: string
  userId: string
  organizationId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
  createdAt: string
  lastUsedAt?: string
}

// Google Calendar integration
export interface GoogleCalendarToken {
  id: string
  userId: string
  organizationId: string
  workspaceId?: string | null // Multi-workspace support
  accessToken: string
  refreshToken: string
  tokenType: string
  expiryDate: number
  scope?: string
  calendarId: string
  syncEnabled: boolean
  lastSyncAt?: string
  createdAt: string
  updatedAt: string
}

export interface GoogleCalendarEventMapping {
  id: string
  userId: string
  googleEventId: string
  itemType: "task" | "rock"
  itemId: string
  calendarId: string
  createdAt: string
  updatedAt: string
}

// API Key for external integrations (MCP, Claude Desktop, etc.)
export interface ApiKey {
  id: string
  organizationId: string
  workspaceId: string | null
  createdBy: string
  name: string
  key: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  expiresAt: string | null
}

// ============================================
// FOCUS MODE & TIME TRACKING TYPES
// ============================================

export interface FocusSession {
  id: string
  organizationId: string
  userId: string
  taskId?: string
  rockId?: string
  startedAt: string
  endedAt?: string
  durationMinutes?: number
  breakMinutes: number
  sessionType: "pomodoro" | "custom" | "deep_work"
  notes?: string
  completed: boolean
  createdAt: string
}

export interface TimeEntry {
  id: string
  organizationId: string
  userId: string
  taskId?: string
  rockId?: string
  startedAt: string
  endedAt?: string
  durationMinutes?: number
  description?: string
  billable: boolean
  createdAt: string
}

// ============================================
// SUBTASK TYPES
// ============================================

export interface TaskSubtask {
  id: string
  taskId: string
  title: string
  completed: boolean
  completedAt?: string
  sortOrder: number
  createdAt: string
}

// ============================================
// WEEKLY REVIEW TYPES
// ============================================

export interface WeeklyReview {
  id: string
  organizationId: string
  userId: string
  weekStart: string
  weekEnd: string
  accomplishments: { text: string; category?: string }[]
  wentWell?: string
  couldImprove?: string
  nextWeekGoals: { text: string; priority?: string }[]
  notes?: string
  mood?: "positive" | "neutral" | "negative"
  energyLevel?: number // 1-5
  productivityRating?: number // 1-5
  createdAt: string
  updatedAt: string
}

// ============================================
// ACHIEVEMENT SYSTEM TYPES
// ============================================

export interface Achievement {
  id: string
  name: string
  description?: string
  category: "streak" | "tasks" | "rocks" | "engagement"
  icon: string
  badgeColor: string
  criteria: {
    type: string
    threshold: number
  }
  points: number
  isActive: boolean
  createdAt: string
}

export interface UserAchievement {
  id: string
  organizationId: string
  userId: string
  achievementId: string
  achievement?: Achievement
  earnedAt: string
  progress: number
  notified: boolean
}

// ============================================
// ROCK DEPENDENCY TYPES
// ============================================

export interface RockDependency {
  id: string
  organizationId: string
  rockId: string
  dependsOnRockId: string
  dependencyType: "blocks" | "soft_dependency"
  createdAt: string
  // Populated fields
  rock?: Rock
  dependsOnRock?: Rock
}

// ============================================
// DASHBOARD CUSTOMIZATION TYPES
// ============================================

export interface DashboardWidget {
  id: string
  type: "stats" | "rocks" | "tasks" | "eod_calendar" | "focus" | "achievements" | "quick_actions"
  title?: string
  enabled: boolean
  settings?: Record<string, unknown>
}

export interface DashboardLayout {
  id: string
  organizationId: string
  userId: string
  layout: {
    i: string
    x: number
    y: number
    w: number
    h: number
    minW?: number
    minH?: number
  }[]
  widgets: DashboardWidget[]
  createdAt: string
  updatedAt: string
}

// ============================================
// RECENT ITEMS TYPES
// ============================================

export interface RecentItem {
  id: string
  organizationId: string
  userId: string
  itemType: "task" | "rock" | "eod_report"
  itemId: string
  viewedAt: string
  // Populated fields
  item?: AssignedTask | Rock | EODReport
}

// ============================================
// STANDUP REPORT TYPES
// ============================================

export interface StandupMemberReport {
  memberId: string
  memberName: string
  yesterday: string[]
  today: string[]
  blockers: string[]
}

export interface StandupReport {
  id: string
  organizationId: string
  generatedBy: string
  reportDate: string
  content: {
    members: StandupMemberReport[]
    summary?: string
  }
  summary?: string
  sharedTo: { channel: string; sentAt: string }[]
  createdAt: string
}

// ============================================
// SMART SUGGESTION TYPES
// ============================================

export interface TaskSuggestion {
  id: string
  type: "from_eod" | "overdue_rock" | "similar_task" | "workload"
  title: string
  description?: string
  reason: string
  priority: "high" | "medium" | "normal"
  suggestedAssigneeId?: string
  suggestedRockId?: string
  suggestedDueDate?: string
  dismissed: boolean
  createdAt: string
}

// ============================================
// EXTENDED TYPES WITH NEW FIELDS
// ============================================

export interface AssignedTaskExtended extends AssignedTask {
  subtasks?: TaskSubtask[]
  estimatedMinutes?: number
  actualMinutes?: number
  timeTrackingEnabled?: boolean
}

export interface EODReportExtended extends EODReport {
  mood?: "positive" | "neutral" | "negative"
  energyLevel?: number
}

export interface TeamMemberWithAchievements extends TeamMember {
  achievements?: UserAchievement[]
  totalPoints?: number
  focusHoursThisWeek?: number
}

// ============================================
// MANAGER DASHBOARD TYPES
// ============================================

// Direct report with aggregated metrics
export interface DirectReport {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  department: string
  jobTitle?: string
  status: "active" | "invited" | "pending" | "inactive"
  joinDate: string
  // Task metrics
  metrics: DirectReportMetrics
  // Recent activity
  recentActivity: DirectReportActivity
  // Current rocks
  rocks: DirectReportRock[]
  // EOD status
  eodStatus: EODStatus
  // Sentiment (from AI analysis)
  sentiment?: DirectReportSentiment
}

export interface DirectReportMetrics {
  // Tasks
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  overdueTasks: number
  taskCompletionRate: number // 0-100
  tasksCompletedThisWeek: number
  tasksCompletedLastWeek: number
  avgTasksPerWeek: number
  // Rocks
  totalRocks: number
  onTrackRocks: number
  atRiskRocks: number
  blockedRocks: number
  completedRocks: number
  avgRockProgress: number // 0-100
  // EOD
  eodSubmittedToday: boolean
  eodStreakDays: number
  eodSubmissionRateLast30Days: number // 0-100
  lastEodDate?: string
  // Engagement
  escalationsThisMonth: number
  blockersMentioned: number
}

export interface DirectReportActivity {
  lastActive?: string
  recentTasksCompleted: Array<{
    id: string
    title: string
    completedAt: string
    rockTitle?: string
  }>
  recentEodSummary?: string
  upcomingDeadlines: Array<{
    id: string
    title: string
    type: "task" | "rock"
    dueDate: string
    priority?: "high" | "medium" | "normal"
  }>
}

export interface DirectReportRock {
  id: string
  title: string
  progress: number
  status: "on-track" | "at-risk" | "blocked" | "completed"
  dueDate: string
  quarter?: string
}

export interface EODStatus {
  submittedToday: boolean
  lastSubmittedAt?: string
  lastSubmittedDate?: string
  streakDays: number
  needsEscalation: boolean
  escalationNote?: string
  tasksReported?: number
  prioritiesSet?: number
}

export interface DirectReportSentiment {
  current: "positive" | "neutral" | "negative" | "stressed"
  trend: "improving" | "stable" | "declining"
  lastUpdated?: string
  concernFlags?: string[]
}

// Manager dashboard overview
export interface ManagerDashboard {
  manager: {
    id: string
    name: string
    email: string
    avatar?: string
    department: string
    jobTitle?: string
  }
  teamSummary: TeamSummary
  directReports: DirectReport[]
  alerts: ManagerAlert[]
  insights: ManagerInsight[]
}

export interface TeamSummary {
  totalMembers: number
  activeMembers: number
  // Task health
  totalPendingTasks: number
  totalOverdueTasks: number
  avgTaskCompletionRate: number
  tasksCompletedThisWeek: number
  // Rock health
  totalActiveRocks: number
  rocksOnTrack: number
  rocksAtRisk: number
  rocksBlocked: number
  avgRockProgress: number
  // EOD health
  eodSubmissionRateToday: number
  eodSubmissionRate7Days: number
  avgEodStreak: number
  // Sentiment
  teamSentiment: "positive" | "neutral" | "negative" | "mixed"
  // Escalations
  activeEscalations: number
  unaddressedBlockers: number
}

export interface ManagerAlert {
  id: string
  type: "overdue_task" | "blocked_rock" | "missed_eod" | "escalation" | "at_risk" | "low_engagement"
  severity: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  memberId: string
  memberName: string
  relatedItemId?: string
  relatedItemType?: "task" | "rock" | "eod"
  createdAt: string
  actionUrl?: string
}

export interface ManagerInsight {
  id: string
  type: "workload" | "performance" | "sentiment" | "pattern" | "recommendation"
  title: string
  description: string
  data?: Record<string, unknown>
  priority: "high" | "medium" | "low"
  actionable: boolean
  suggestedAction?: string
}

// ============================================
// PRODUCTIVITY TRACKING TYPES (Rize-inspired)
// ============================================

// Focus Score - calculated from task completion, consistency, and rock progress
export interface FocusScore {
  score: number // 0-100
  breakdown: {
    taskCompletion: number      // Weight: 30%
    rockProgress: number        // Weight: 25%
    consistencyStreak: number   // Weight: 20%
    reportSubmission: number    // Weight: 15%
    blockerResolution: number   // Weight: 10%
  }
  trend: "up" | "down" | "stable"
  weekOverWeek: number // percentage change
  calculatedAt: string
}

// Focus Score Input for calculations
export interface FocusScoreInput {
  tasksCompleted: number
  tasksPlanned: number
  rockProgressPercent: number
  consecutiveSubmissions: number
  totalPossibleDays: number
  reportsSubmittedOnTime: number
  totalReportsDue: number
  blockersResolved: number
  totalBlockers: number
}

// User Streak data
export interface UserStreak {
  id: string
  organizationId: string
  workspaceId?: string | null // Multi-workspace support
  userId: string
  currentStreak: number
  longestStreak: number
  lastSubmissionDate: string | null
  milestoneDates: {
    "7"?: string
    "14"?: string
    "30"?: string
    "60"?: string
    "90"?: string
    "100"?: string
  }
  updatedAt: string
}

// Streak milestones
export type StreakMilestone = 7 | 14 | 30 | 60 | 90 | 100

export interface StreakMilestoneInfo {
  milestone: StreakMilestone
  label: string
  icon: string // emoji
  color: string
}

// Focus Block - manual time tracking sessions
export interface FocusBlock {
  id: string
  organizationId: string
  workspaceId?: string | null // Multi-workspace support
  userId: string
  startTime: string
  endTime: string
  category: FocusBlockCategory
  quality: 1 | 2 | 3 | 4 | 5 | null // Self-rated quality (nullable)
  interruptions: number
  notes?: string | null
  taskId?: string | null // Optional link to task
  rockId?: string | null // Optional link to rock
  createdAt: string
}

export type FocusBlockCategory = "deep_work" | "meetings" | "admin" | "collaboration" | "learning" | "planning"

// Focus block creation input
export interface FocusBlockInput {
  workspaceId?: string | null // Multi-workspace support
  startTime: string
  endTime: string
  category: FocusBlockCategory
  quality?: 1 | 2 | 3 | 4 | 5
  interruptions?: number
  notes?: string
  taskId?: string
  rockId?: string
}

// Daily Energy/Mood tracking
export interface DailyEnergy {
  id: string
  organizationId: string
  workspaceId?: string | null // Multi-workspace support
  userId: string
  date: string
  energyLevel: EnergyLevel
  mood: MoodEmoji
  factors: EnergyFactor[]
  notes?: string | null
  createdAt: string
}

export type EnergyLevel = "low" | "medium" | "high" | "peak"
export type MoodEmoji = "😫" | "😐" | "🙂" | "😄" | "🔥"
export type EnergyFactor =
  | "good_sleep"
  | "exercise"
  | "caffeine"
  | "stress"
  | "meetings"
  | "deadline_pressure"
  | "great_progress"
  | "team_support"

// Daily energy input
export interface DailyEnergyInput {
  date: string
  energyLevel: EnergyLevel
  mood: MoodEmoji
  factors?: EnergyFactor[]
  notes?: string
}

// Stored Focus Score history
export interface FocusScoreHistory {
  id: string
  organizationId: string
  userId: string
  date: string
  score: number
  breakdown: FocusScore["breakdown"]
  createdAt: string
}

// Weekly productivity summary
export interface WeeklyProductivitySummary {
  weekStart: string
  weekEnd: string
  userId: string
  // Focus metrics
  avgFocusScore: number
  focusScoreTrend: "up" | "down" | "stable"
  // Time metrics
  totalFocusHours: number
  focusBlocksByCategory: Record<FocusBlockCategory, number>
  avgDailyFocusHours: number
  // Task metrics
  tasksCompleted: number
  tasksPlanned: number
  taskCompletionRate: number
  // Rock metrics
  rocksProgressed: number
  avgRockProgress: number
  // Energy metrics
  avgEnergyLevel: number // 1-4 scale
  moodDistribution: Record<MoodEmoji, number>
  // Streak
  currentStreak: number
  // EOD metrics
  eodSubmissionRate: number
  escalationsRaised: number
}

// Productivity dashboard data
export interface ProductivityDashboardData {
  focusScore: FocusScore
  streak: UserStreak
  todayEnergy: DailyEnergy | null
  recentFocusBlocks: FocusBlock[]
  weeklySummary: WeeklyProductivitySummary
  focusScoreHistory: FocusScoreHistory[]
}

// Team productivity comparison (for managers)
export interface TeamProductivityComparison {
  userId: string
  userName: string
  avatar?: string
  focusScore: number
  currentStreak: number
  tasksCompletedThisWeek: number
  avgRockProgress: number
  rank: number
}

// Productivity leaderboard
export interface ProductivityLeaderboard {
  period: "weekly" | "monthly"
  organizationId: string
  entries: TeamProductivityComparison[]
  generatedAt: string
}

// ============================================
// MULTI-TENANCY & PRODUCTIZATION TYPES
// ============================================

// Subscription tier definition
export interface SubscriptionTier {
  id: string
  name: string
  slug: string
  description?: string
  priceMonthly: number // In cents
  priceYearly: number // In cents
  maxSeats: number | null // null = unlimited
  features: string[]
  isActive: boolean
  sortOrder: number
  createdAt: string
}

// Organization subscription details
export interface OrganizationSubscription {
  id: string
  organizationId: string
  tierId: string
  status: "active" | "trialing" | "past_due" | "canceled" | "paused"
  billingCycle: "monthly" | "yearly"
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialEndsAt?: string
  canceledAt?: string
  seatsPurchased: number
  seatsUsed: number
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  // Joined fields
  tier?: SubscriptionTier
}

// Billing history entry
export interface BillingHistoryEntry {
  id: string
  organizationId: string
  subscriptionId?: string
  amount: number // In cents
  currency: string
  status: "paid" | "pending" | "failed" | "refunded"
  description?: string
  invoiceUrl?: string
  stripeInvoiceId?: string
  billingPeriodStart?: string
  billingPeriodEnd?: string
  createdAt: string
}

// Cross-workspace task for managing multiple organizations
export interface CrossWorkspaceTask {
  id: string
  sourceOrganizationId: string
  targetOrganizationId: string
  sourceTaskId?: string
  targetTaskId?: string
  assignedByUserId: string
  title: string
  description?: string
  priority: "high" | "medium" | "normal"
  status: "pending" | "synced" | "completed" | "archived"
  createdAt: string
  updatedAt: string
  // Joined fields
  sourceOrganization?: Organization
  targetOrganization?: Organization
}

// Organization feature flag
export interface OrganizationFeature {
  id: string
  organizationId: string
  featureKey: string
  enabled: boolean
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// User organization preferences
export interface UserOrganizationPreferences {
  id: string
  userId: string
  lastOrganizationId?: string
  defaultOrganizationId?: string
  organizationOrder: string[] // Organization IDs in preferred order
  preferences?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

// Audit log entry for compliance
export interface AuditLogEntry {
  id: string
  organizationId?: string
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

// White-label configuration
export interface WhiteLabelConfig {
  id: string
  organizationId: string
  brandName: string
  logoUrl?: string
  logoDarkUrl?: string
  faviconUrl?: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  customCss?: string
  customDomain?: string
  emailFromName?: string
  emailFromAddress?: string
  supportEmail?: string
  supportUrl?: string
  termsUrl?: string
  privacyUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// User's organization list item (for org switcher)
export interface UserOrganizationItem {
  id: string
  name: string
  slug: string
  logoUrl?: string
  primaryColor?: string
  role: "owner" | "admin" | "member"
  memberStatus: "active" | "invited" | "pending" | "inactive"
  subscriptionTier?: string
  subscriptionStatus?: string
  seatsUsed?: number
  seatsPurchased?: number
  joinedAt: string
  isCurrent?: boolean
}

// Organization seat usage summary
export interface OrganizationSeatUsage {
  organizationId: string
  organizationName: string
  seatsPurchased: number
  seatsUsed: number
  seatsAvailable: number
  tierMaxSeats: number | null
}

// Create organization request
export interface CreateOrganizationRequest {
  name: string
  slug?: string // Auto-generated if not provided
  logoUrl?: string
  primaryColor?: string
  billingEmail?: string
}

// Switch organization response
export interface SwitchOrganizationResponse {
  success: boolean
  organization: Organization
  member: OrganizationMember
  token: string
  expiresAt: string
}

// Workspace invite link (permanent, reusable, one per workspace)
export interface WorkspaceInviteLink {
  id: string
  workspaceId: string
  organizationId: string
  token: string
  createdBy: string
  createdAt: string
}
