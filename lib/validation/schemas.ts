/**
 * Centralized Zod Validation Schemas for API Routes
 *
 * This module provides type-safe validation for all API endpoints,
 * ensuring data integrity and consistent error handling across the application.
 */

import { z } from "zod"

// ============================================
// COMMON FIELD VALIDATORS
// ============================================

export const emailSchema = z.string().email("Invalid email address").toLowerCase()

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number"
  )

// TaskSpace uses 24-char hex IDs (not UUIDs), so accept both formats
export const uuidSchema = z.string().min(1, "ID is required").regex(
  /^[0-9a-f]{24}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid ID format"
)

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")

export const isoDateSchema = z.string().datetime({ message: "Invalid ISO date format" })

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  organizationId: z.string().uuid().optional(),
})

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  organizationName: z.string().min(2).max(100).optional(),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
})

// 2FA schemas
export const twoFactorVerifySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  code: z.string().min(6, "Code must be at least 6 characters").max(8, "Code must be at most 8 characters"),
  organizationId: z.string().optional(),
})

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, "Password is required"),
})

export const twoFactorVerifySetupSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Please enter a valid 6-digit code"),
})

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1).default(["read"]),
  workspaceId: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

// ============================================
// ORGANIZATION SCHEMAS
// ============================================

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  timezone: z.string().default("America/New_York"),
})

const weekStartDaySchema = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3),
  z.literal(4), z.literal(5), z.literal(6),
])

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  settings: z.object({
    timezone: z.string().optional(),
    weekStartDay: weekStartDaySchema.optional(),
    eodReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    eodEmailDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
    eodFrequency: z.enum(["daily", "weekly", "bi-weekly", "monthly"]).optional(),
    enableEmailNotifications: z.boolean().optional(),
    enableSlackIntegration: z.boolean().optional(),
    slackWebhookUrl: z.string().url().optional(),
    teamToolsUrl: z.string().url().optional(),
  }).passthrough().optional(),
  subscription: z.object({
    plan: z.enum(["free", "team", "business"]).optional(),
    status: z.enum(["active", "trialing", "past_due", "canceled"]).optional(),
    currentPeriodEnd: z.string().nullable().optional(),
    maxUsers: z.number().int().min(1).optional(),
    features: z.array(z.string()).optional(),
    billingCycle: z.enum(["monthly", "yearly"]).nullable().optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
  }).passthrough().optional(),
})

export const updateOrganizationSettingsSchema = z.object({
  timezone: z.string().optional(),
  weekStartDay: z.number().int().min(0).max(6).optional(),
  eodReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  enableEmailNotifications: z.boolean().optional(),
  enableSlackIntegration: z.boolean().optional(),
  slackWebhookUrl: z.string().url().nullable().optional(),
  publicEodToken: z.string().min(16).max(128).nullable().optional(),
  asanaIntegration: z
    .object({
      enabled: z.boolean(),
      projectGid: z.string(),
      projectName: z.string(),
      workspaceGid: z.string(),
      workspaceName: z.string(),
      syncTasks: z.boolean().default(true),
      syncRocks: z.boolean().default(true),
      userMappings: z
        .array(
          z.object({
            aimsUserId: z.string(),
            asanaUserId: z.string(),
            asanaUserEmail: z.string().email().optional(),
            asanaUserName: z.string().optional(),
          })
        )
        .optional()
        .default([]),
      lastSyncAt: z.string().nullable().optional(),
    })
    .optional(),
})

// ============================================
// MEMBER SCHEMAS
// ============================================

const notificationChannelsSchema = z.object({
  email: z.boolean(),
  inApp: z.boolean(),
  slack: z.boolean(),
})

const notificationPreferencesSchema = z.object({
  task_assigned: notificationChannelsSchema,
  eod_reminder: notificationChannelsSchema,
  escalation: notificationChannelsSchema,
  rock_updated: notificationChannelsSchema,
  digest: z.object({
    email: z.boolean(),
    slack: z.boolean(),
  }),
})

export const createMemberSchema = z.object({
  email: emailSchema,
  name: z.string().min(2).max(100),
  role: z.enum(["admin", "member"]).default("member"),
  department: z.string().min(1).max(100).default("General"),
  weeklyMeasurable: z.string().max(500).optional(),
})

export const updateMemberSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"), // Organization member ID (hex string, not UUID)
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().nullable().optional(),
  role: z.enum(["admin", "member", "owner"]).optional(),
  department: z.string().min(1).max(100).nullable().optional(),
  weeklyMeasurable: z.string().max(500).optional(),
  jobTitle: z.string().max(100).nullable().optional(),
  timezone: z.string().optional(),
  eodReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notificationPreferences: notificationPreferencesSchema.optional(),
})

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "member"]).default("member"),
  department: z.string().min(1).max(100).default("General"),
  workspaceId: uuidSchema.optional(),
  name: z.string().min(2).max(100).optional(), // Optional pre-filled name
})

export const resendInvitationSchema = z.object({
  id: z.string().min(1, "Invitation ID is required"),
})

export const bulkInviteSchema = z.object({
  emails: z.array(emailSchema).min(1).max(50),
  role: z.enum(["admin", "member"]).default("member"),
  department: z.string().min(1).max(100).default("General"),
})

// ============================================
// TASK SCHEMAS
// ============================================

export const prioritySchema = z.enum(["high", "medium", "normal"])

export const taskStatusSchema = z.enum(["pending", "in-progress", "completed"])

export const recurrenceSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly"]),
  interval: z.number().int().min(1).max(365),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  endDate: dateSchema.optional(),
})

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000).optional(),
  assigneeId: uuidSchema.optional(), // Optional - defaults to current user
  workspaceId: uuidSchema, // Required for data isolation
  priority: prioritySchema.default("normal"),
  dueDate: z.preprocess((v) => (v === "" ? undefined : v), dateSchema.optional()), // Optional - defaults to today; empty string treated as absent
  rockId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  recurrence: recurrenceSchema.optional(),
})

export const updateTaskSchema = z.object({
  id: uuidSchema, // Task ID to update
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).optional(),
  assigneeId: uuidSchema.optional(), // Reassignment — admin only
  assigneeName: z.string().trim().min(1).max(200).optional(),
  priority: prioritySchema.optional(),
  dueDate: dateSchema.optional(),
  status: taskStatusSchema.optional(),
  completedAt: isoDateSchema.nullable().optional(),
  rockId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  expectedUpdatedAt: isoDateSchema.optional(), // Optimistic concurrency — reject if stale
})

export const addTaskCommentSchema = z.object({
  text: z.string().min(1).max(2000),
})

export const bulkTaskOperationSchema = z.object({
  taskIds: z.array(uuidSchema).min(1).max(100),
  operation: z.enum(["complete", "delete", "archive", "changePriority", "changeDueDate"]),
  data: z.record(z.unknown()).optional(),
})

// ============================================
// ROCK SCHEMAS
// ============================================

export const rockStatusSchema = z.enum(["on-track", "at-risk", "blocked", "completed"])

export const milestoneSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(500),
  completed: z.boolean().default(false),
  completedAt: isoDateSchema.optional(),
  dueDate: dateSchema.optional(),
})

export const createRockSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(5000).default(""), // Optional — defaults to empty string
  userId: uuidSchema.optional(), // Optional - defaults to current user
  workspaceId: uuidSchema, // Required for data isolation
  dueDate: dateSchema,
  quarter: z.string().regex(/^Q[1-4] \d{4}$/).optional(),
  bucket: z.string().max(100).optional(),
  outcome: z.string().max(1000).optional(),
  doneWhen: z.array(z.string()).optional(), // Array of completion criteria
  projectId: uuidSchema.nullable().optional(),
})

export const updateRockSchema = z.object({
  id: uuidSchema, // Rock ID to update
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().trim().max(5000).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: dateSchema.optional(),
  status: rockStatusSchema.optional(),
  quarter: z.string().regex(/^Q[1-4] \d{4}$/).optional(),
  bucket: z.string().max(100).optional(),
  outcome: z.string().max(1000).optional(),
  doneWhen: z.array(z.string()).optional(),
  projectId: uuidSchema.nullable().optional(),
  expectedUpdatedAt: isoDateSchema.optional(), // Optimistic concurrency — reject if stale
})

export const bulkRockSchema = z.object({
  rocks: z.array(createRockSchema).min(1).max(50),
})

// ============================================
// EOD REPORT SCHEMAS
// ============================================

export const eodTaskSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(1000),
  taskId: uuidSchema.optional(), // Optional reference to AssignedTask
  rockId: z.string().nullable().optional().transform(val => {
    // Convert empty strings, "undefined", "null" to null
    if (!val || val === "" || val === "undefined" || val === "null") return null
    // Validate UUID format if present
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(val) ? val : null
  }),
  rockTitle: z.string().nullable(),
})

export const eodPrioritySchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(1000),
  rockId: z.string().nullable().optional().transform(val => {
    // Convert empty strings, "undefined", "null" to null
    if (!val || val === "" || val === "undefined" || val === "null") return null
    // Validate UUID format if present
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(val) ? val : null
  }),
  rockTitle: z.string().nullable(),
})

const fileAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  type: z.string(),
  size: z.number(),
  uploadedAt: z.string(),
})

export const createEODReportSchema = z.object({
  date: dateSchema.optional(), // Optional - defaults to today in org timezone
  tasks: z.array(eodTaskSchema).min(1).max(100),
  challenges: z.string().max(5000).default(""),
  tomorrowPriorities: z.array(eodPrioritySchema).max(100),
  needsEscalation: z.boolean().default(false),
  escalationNote: z.string().max(2000).nullable().optional(),
  metricValueToday: z.union([z.number(), z.string(), z.null()]).optional(),
  mood: z.enum(["positive", "neutral", "negative"]).optional(),
  attachments: z.array(fileAttachmentSchema).optional(),
  workspaceId: uuidSchema, // Required for data isolation
})

export const updateEODReportSchema = z.object({
  id: uuidSchema, // Report ID to update
  date: dateSchema.optional(), // Optional new date
  tasks: z.array(eodTaskSchema).optional(),
  challenges: z.string().max(5000).optional(),
  tomorrowPriorities: z.array(eodPrioritySchema).optional(),
  needsEscalation: z.boolean().optional(),
  escalationNote: z.string().max(2000).nullable().optional(),
  mood: z.enum(["positive", "neutral", "negative"]).nullable().optional(),
})

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const notificationTypeSchema = z.enum([
  "task_assigned",
  "rock_updated",
  "eod_reminder",
  "escalation",
  "invitation",
  "system",
])

export const createNotificationSchema = z.object({
  userId: uuidSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().max(1000),
  actionUrl: z.string().url().optional(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
})

export const markNotificationsReadSchema = z.object({
  notificationIds: z.array(uuidSchema).min(1).max(100).optional(),
  markAll: z.boolean().optional(),
})

// ============================================
// AI SCHEMAS
// ============================================

export const brainDumpSchema = z.object({
  content: z.string().min(10).max(10000),
})

export const aiQuerySchema = z.object({
  query: z.string().min(1).max(2000),
  context: z
    .object({
      includeEodReports: z.boolean().default(true),
      includeTasks: z.boolean().default(true),
      includeRocks: z.boolean().default(true),
      includeTeamMembers: z.boolean().default(true),
      dateRange: z.number().int().min(1).max(90).default(14),
    })
    .optional(),
})

export const slackMessageSchema = z.object({
  channel: z.string().optional(),
  message: z.string().min(1).max(3000),
  attachments: z.array(z.record(z.unknown())).optional(),
})

// ============================================
// EXPORT SCHEMAS
// ============================================

export const exportSchema = z.object({
  type: z.enum(["eod", "tasks", "rocks", "team"]),
  format: z.enum(["csv", "json"]).default("csv"),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  userId: uuidSchema.optional(),
})

export const calendarExportSchema = z.object({
  type: z.enum(["all", "tasks", "rocks"]).default("all"),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
})

// ============================================
// INVITATION SCHEMAS
// ============================================

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  password: passwordSchema.optional(),
})

export const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1, "Organization ID is required"),
})

// ============================================
// BRANDING SCHEMAS
// ============================================

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").optional()

export const updateBrandingSchema = z.object({
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: hexColorSchema,
  secondaryColor: hexColorSchema,
  accentColor: hexColorSchema,
  faviconUrl: z.string().url().nullable().optional(),
  customDomain: z.string().max(253).nullable().optional(),
})

// ============================================
// SCORECARD SCHEMAS
// ============================================

export const updateScorecardEntrySchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  weekEnding: dateSchema,
  value: z.coerce.number({ invalid_type_error: "Value must be a number" }),
  workspaceId: z.string().min(1, "Workspace ID is required"),
})

// ============================================
// WORKSPACE SCHEMAS
// ============================================

export const workspaceTypeSchema = z.enum(["leadership", "department", "team", "project"])

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  type: workspaceTypeSchema.default("team"),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  settings: z.record(z.unknown()).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").nullable().optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").nullable().optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  type: workspaceTypeSchema.optional(),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
  settings: z.record(z.unknown()).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").nullable().optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").nullable().optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color format").nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
})

// ============================================
// NOTIFICATION UPDATE SCHEMA
// ============================================

export const updateNotificationSchema = z.object({
  id: z.string().optional(),
  markAllRead: z.boolean().optional(),
})

// ============================================
// PUSH SUBSCRIPTION SCHEMAS
// ============================================

export const createPushSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
})

// ============================================
// FOCUS BLOCK SCHEMAS
// ============================================

export const focusCategorySchema = z.enum(["deep_work", "meetings", "admin", "collaboration", "learning", "planning"])
export const focusQualitySchema = z.number().int().min(1).max(5).optional()

export const createFocusBlockSchema = z.object({
  workspaceId: z.string().optional().nullable(), // Multi-workspace support
  startTime: isoDateSchema,
  endTime: isoDateSchema,
  category: focusCategorySchema,
  quality: focusQualitySchema,
  interruptions: z.number().int().min(0).default(0),
  notes: z.string().max(1000).optional(),
  taskId: z.string().optional(),
  rockId: z.string().optional(),
})

// ============================================
// BILLING SCHEMAS
// ============================================

export const checkoutSchema = z.object({
  plan: z.enum(["team", "business"]),
  billingCycle: z.enum(["monthly", "yearly"]),
})

export const updateSubscriptionSchema = z.object({
  action: z.enum(["change_plan", "cancel", "resume", "portal"]),
  plan: z.enum(["team", "business"]).optional(),
  billingCycle: z.enum(["monthly", "yearly"]).optional(),
}).refine(
  (data) => {
    if (data.action === "change_plan") {
      return data.plan !== undefined && data.billingCycle !== undefined
    }
    return true
  },
  {
    message: "Plan and billing cycle are required when changing plan",
  }
)

// ============================================
// TEST EMAIL SCHEMA
// ============================================

export const testEmailSchema = z.object({
  testEmail: emailSchema,
})

// ============================================
// MEETING SCHEMAS
// ============================================

export const sectionTypeSchema = z.enum(["segue", "scorecard", "rocks", "headlines", "ids", "conclude"])

export const createMeetingSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  title: z.string().max(200).trim().optional(),
  scheduledAt: z.string().min(1, "Scheduled date/time is required"),
  attendees: z.array(z.string()).optional().default([]),
})

export const updateMeetingSchema = z.object({
  notes: z.string().max(10000).trim().optional(),
  attendees: z.array(z.string()).optional(),
  title: z.string().max(200).trim().optional(),
})

export const endMeetingSchema = z.object({
  rating: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(5000).trim().optional(),
})

export const updateMeetingSectionSchema = z.object({
  sectionType: sectionTypeSchema,
  action: z.enum(["start", "complete", "update"]),
  data: z.record(z.unknown()).optional(),
})

export const createMeetingTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(500).trim(),
  assigneeId: z.string().optional(),
  dueDate: dateSchema.optional(),
  issueId: z.string().optional(),
})

export const updateMeetingTodoSchema = z.object({
  completed: z.boolean().optional(),
})

export const convertTodoToTaskSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
})

export const updateMeetingNotesSchema = z.object({
  section: sectionTypeSchema,
  content: z.string().max(10000).default(""),
})

export const agendaSectionSchema = z.object({
  sectionType: sectionTypeSchema,
  orderIndex: z.number().int().min(0),
  durationTarget: z.number().int().min(1).max(120),
})

export const updateAgendaSchema = z.object({
  sections: z.array(agendaSectionSchema).min(1),
})

// ============================================
// ISSUE SCHEMAS
// ============================================

export const issueStatusSchema = z.enum(["open", "active", "resolved", "dropped"])
export const issuePrioritySchema = z.number().int().min(0).max(10).default(0)

export const createIssueSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  title: z.string().min(1, "Title is required").max(500).trim(),
  description: z.string().max(5000).optional(),
  priority: issuePrioritySchema,
  ownerId: z.string().optional(),
  sourceType: z.string().optional(),
  sourceId: z.string().optional(),
})

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(5000).optional(),
  priority: z.number().int().min(0).max(10).optional(),
  status: issueStatusSchema.optional(),
  ownerId: z.string().nullable().optional(),
})

export const resolveIssueSchema = z.object({
  resolution: z.string().max(2000).optional(),
  meetingId: z.string().optional(),
})

// ============================================
// DAILY ENERGY SCHEMAS
// ============================================

export const energyLevelSchema = z.enum(["low", "medium", "high", "peak"])

export const moodEmojiSchema = z.enum(["😫", "😐", "🙂", "😄", "🔥"])

export const energyFactorSchema = z.enum([
  "good_sleep",
  "exercise",
  "caffeine",
  "stress",
  "meetings",
  "deadline_pressure",
  "great_progress",
  "team_support",
])

export const createDailyEnergySchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  date: dateSchema,
  energyLevel: energyLevelSchema,
  mood: moodEmojiSchema,
  factors: z.array(energyFactorSchema).optional().default([]),
  notes: z.string().max(2000).optional(),
})

// ============================================
// FOCUS BLOCK UPDATE SCHEMA
// ============================================

export const updateFocusBlockSchema = z.object({
  startTime: isoDateSchema.optional(),
  endTime: isoDateSchema.optional(),
  category: focusCategorySchema.optional(),
  quality: z.number().int().min(1).max(5).optional(),
  interruptions: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  taskId: z.string().optional(),
  rockId: z.string().optional(),
})

// ============================================
// SCORECARD METRIC SCHEMAS
// ============================================

export const targetDirectionSchema = z.enum(["above", "below", "exact"])
export const metricFrequencySchema = z.enum(["weekly", "monthly"])

export const createScorecardMetricSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  name: z.string().min(1, "Metric name is required").max(200).trim(),
  description: z.string().max(1000).optional(),
  ownerId: z.string().optional(),
  targetValue: z.number().optional(),
  targetDirection: targetDirectionSchema.default("above"),
  unit: z.string().max(50).default(""),
  frequency: metricFrequencySchema.default("weekly"),
  displayOrder: z.number().int().min(0).default(0),
})

export const updateScorecardMetricSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).nullable().optional(),
  ownerId: z.string().nullable().optional(),
  targetValue: z.number().nullable().optional(),
  targetDirection: targetDirectionSchema.optional(),
  unit: z.string().max(50).optional(),
  frequency: metricFrequencySchema.optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export const createScorecardEntrySchema = z.object({
  metricId: z.string().min(1, "Metric ID is required"),
  value: z.coerce.number({ invalid_type_error: "Value must be a number" }),
  weekStart: dateSchema.optional(),
  notes: z.string().max(1000).optional(),
})

// ============================================
// ROCK CHECK-IN SCHEMA
// ============================================

export const rockConfidenceSchema = z.enum(["on_track", "at_risk", "off_track"])

export const createRockCheckinSchema = z.object({
  confidence: rockConfidenceSchema,
  notes: z.string().max(2000).optional(),
  weekStart: dateSchema.optional(),
})

// ============================================
// ROCK COMPLETE SCHEMA
// ============================================

export const completeRockSchema = z.object({
  reopen: z.boolean().optional(),
})

// ============================================
// TASK COMMENT SCHEMA
// ============================================

export const createTaskCommentSchema = z.object({
  text: z.string().min(1, "Comment text is required").max(2000).trim(),
})

// ============================================
// TASK SUBTASK SCHEMAS
// ============================================

export const createSubtaskSchema = z.object({
  title: z.string().min(1, "Subtask title is required").max(500).trim(),
  completed: z.boolean().default(false),
  orderIndex: z.number().int().min(0).optional(),
})

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  completed: z.boolean().optional(),
  orderIndex: z.number().int().min(0).optional(),
})

export const reorderSubtasksSchema = z.object({
  subtaskIds: z.array(z.string().min(1)).min(1, "subtaskIds array cannot be empty"),
})

// ============================================
// GOOGLE CALENDAR SCHEMA
// ============================================

export const updateGoogleCalendarSettingsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  syncEnabled: z.boolean().optional(),
  calendarId: z.string().optional(),
})

// ============================================
// WORKSPACE MEMBER SCHEMAS
// ============================================

export const workspaceMemberRoleSchema = z.enum(["owner", "admin", "member", "viewer"])

export const addWorkspaceMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: workspaceMemberRoleSchema.default("member"),
})

export const updateWorkspaceMemberRoleSchema = z.object({
  role: workspaceMemberRoleSchema,
})

// ============================================
// MANAGER DIRECT REPORTS SCHEMA
// ============================================

export const assignManagerSchema = z.object({
  memberId: z.string().min(1, "Member ID is required"),
  managerId: z.string().nullable().optional(),
})

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type CreateRockInput = z.infer<typeof createRockSchema>
export type UpdateRockInput = z.infer<typeof updateRockSchema>
export type CreateEODReportInput = z.infer<typeof createEODReportSchema>
export type UpdateEODReportInput = z.infer<typeof updateEODReportSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type BrainDumpInput = z.infer<typeof brainDumpSchema>
export type AIQueryInput = z.infer<typeof aiQuerySchema>
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>
export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>
export type UpdateScorecardEntryInput = z.infer<typeof updateScorecardEntrySchema>
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>
export type CreatePushSubscriptionInput = z.infer<typeof createPushSubscriptionSchema>
export type CreateFocusBlockInput = z.infer<typeof createFocusBlockSchema>
export type UpdateFocusBlockInput = z.infer<typeof updateFocusBlockSchema>
export type TestEmailInput = z.infer<typeof testEmailSchema>
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>
export type EndMeetingInput = z.infer<typeof endMeetingSchema>
export type UpdateMeetingSectionInput = z.infer<typeof updateMeetingSectionSchema>
export type CreateMeetingTodoInput = z.infer<typeof createMeetingTodoSchema>
export type UpdateMeetingTodoInput = z.infer<typeof updateMeetingTodoSchema>
export type ConvertTodoToTaskInput = z.infer<typeof convertTodoToTaskSchema>
export type UpdateMeetingNotesInput = z.infer<typeof updateMeetingNotesSchema>
export type UpdateAgendaInput = z.infer<typeof updateAgendaSchema>
export type CreateIssueInput = z.infer<typeof createIssueSchema>
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>
export type ResolveIssueInput = z.infer<typeof resolveIssueSchema>
export type CreateDailyEnergyInput = z.infer<typeof createDailyEnergySchema>
export type CreateScorecardMetricInput = z.infer<typeof createScorecardMetricSchema>
export type UpdateScorecardMetricInput = z.infer<typeof updateScorecardMetricSchema>
export type CreateScorecardEntryInput = z.infer<typeof createScorecardEntrySchema>
export type CreateRockCheckinInput = z.infer<typeof createRockCheckinSchema>
export type CompleteRockInput = z.infer<typeof completeRockSchema>
export type CreateTaskCommentInput = z.infer<typeof createTaskCommentSchema>
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>
export type ReorderSubtasksInput = z.infer<typeof reorderSubtasksSchema>
export type UpdateGoogleCalendarSettingsInput = z.infer<typeof updateGoogleCalendarSettingsSchema>
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>
export type UpdateWorkspaceMemberRoleInput = z.infer<typeof updateWorkspaceMemberRoleSchema>
export type AssignManagerInput = z.infer<typeof assignManagerSchema>

// ============================================
// IDS BOARD SCHEMAS
// ============================================

export const idsBoardColumnSchema = z.enum(["identify", "discuss", "solve"])
export const idsBoardItemTypeSchema = z.enum(["issue", "rock", "custom"])

export const createIdsBoardItemSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  title: z.string().min(1, "Title is required").max(500).trim(),
  description: z.string().max(5000).optional(),
  columnName: idsBoardColumnSchema,
  itemType: idsBoardItemTypeSchema.default("custom"),
  linkedId: z.string().optional(),
  assignedTo: z.string().optional(),
})

export const updateIdsBoardItemSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.string().max(5000).nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  itemType: idsBoardItemTypeSchema.optional(),
})

export const moveIdsBoardItemSchema = z.object({
  columnName: idsBoardColumnSchema,
  orderIndex: z.number().int().min(0),
})

export type CreateIdsBoardItemInput = z.infer<typeof createIdsBoardItemSchema>
export type UpdateIdsBoardItemInput = z.infer<typeof updateIdsBoardItemSchema>
export type MoveIdsBoardItemInput = z.infer<typeof moveIdsBoardItemSchema>

// ============================================
// WORKSPACE NOTES SCHEMAS
// ============================================

export const upsertWorkspaceNoteSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  content: z.string().max(500000, "Content too large"), // ~500KB limit for rich text
})

export type UpsertWorkspaceNoteInput = z.infer<typeof upsertWorkspaceNoteSchema>

// ============================================
// AI ENDPOINT SCHEMAS
// ============================================

export const aiBrainDumpSchema = z.object({
  content: z.string().min(1, "Brain dump content is required").max(50000),
})

export const aiQueryRequestSchema = z.object({
  query: z.string().min(1, "Query is required").max(50000),
  workspaceId: z.string().min(1).optional(),
})

export const aiEodParseSchema = z.object({
  content: z.string().min(1, "Text dump content is required").max(50000),
  quarter: z.string().regex(/^Q[1-4] \d{4}$/).optional(),
})

export const aiDigestSchema = z.object({
  date: dateSchema.optional(),
})

export const aiSlackNotificationSchema = z.object({
  type: z.enum(["task", "digest", "custom"]),
  workspaceId: z.string().min(1, "workspaceId is required"),
  data: z.record(z.unknown()).default({}),
})

export const aiTaskPatchSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  action: z.enum(["approve", "reject", "update"]),
  updates: z.record(z.unknown()).optional(),
})

export const aiBulkSuggestionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  suggestionIds: z.array(z.string().min(1)).min(1).max(100),
  reviewerNotes: z.string().max(2000).optional(),
})

export const aiSuggestionApproveSchema = z.object({
  modifiedData: z.record(z.unknown()).optional(),
  reviewerNotes: z.string().max(2000).optional(),
})

export const aiSuggestionRejectSchema = z.object({
  reviewerNotes: z.string().max(2000).optional(),
})

export const aiPrioritizeSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    priority: z.string(),
    status: z.string(),
    dueDate: z.string().optional(),
    assigneeName: z.string().optional(),
    rockTitle: z.string().optional(),
  })).max(100, "Cannot prioritize more than 100 tasks at once").default([]),
  rocks: z.array(z.object({
    title: z.string(),
    progress: z.number(),
    status: z.string(),
  })).max(50, "Cannot prioritize more than 50 rocks at once").default([]),
})

export const aiMeetingNotesSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  meetingData: z.record(z.unknown()).refine(
    (d) => JSON.stringify(d).length <= 100_000,
    { message: "Meeting data payload is too large (max 100KB)" }
  ),
})

export const aiManagerInsightsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  directReports: z.array(z.record(z.unknown())).max(50).optional(),
  rocks: z.array(z.record(z.unknown())).max(100).optional(),
  tasks: z.array(z.record(z.unknown())).max(200).optional(),
  eodReports: z.array(z.record(z.unknown())).max(200).optional(),
})

export const aiMeetingPrepSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  rocks: z.array(z.record(z.unknown())).max(50).optional(),
  tasks: z.array(z.record(z.unknown())).max(100).optional(),
  issues: z.array(z.record(z.unknown())).max(100).optional(),
})

export const aiScorecardInsightsSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
})

export const rockParseSchema = z.object({
  text: z.string().min(10, "Please provide rock text to parse (at least 10 characters)").max(50000),
})

// ============================================
// FEATURE ENDPOINT SCHEMAS
// ============================================

export const metricsCreateSchema = z.object({
  memberId: z.string().min(1, "memberId is required"),
  metricName: z.string().min(1, "metricName is required").max(200),
  weeklyGoal: z.number().min(0, "weeklyGoal must be a non-negative number"),
})

export const asanaSyncSchema = z.object({
  direction: z.enum(["to_asana", "from_asana", "both"]).default("both"),
})

export const asanaConnectSchema = z.object({
  personalAccessToken: z.string().min(1, "Personal Access Token is required"),
  workspaceGid: z.string().optional(),
  aimsWorkspaceId: z.string().optional(),
})

export const peopleAssessmentCreateSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  employeeName: z.string().optional(),
  getsIt: z.boolean().default(false),
  wantsIt: z.boolean().default(false),
  hasCapacity: z.boolean().default(false),
  coreValuesRating: z.record(z.unknown()).optional(),
  rightPersonRightSeat: z.enum(["right", "wrong", "unsure"]).optional(),
  notes: z.string().max(5000).optional(),
})

export const peopleAssessmentUpdateSchema = z.object({
  getsIt: z.boolean().optional(),
  wantsIt: z.boolean().optional(),
  hasCapacity: z.boolean().optional(),
  coreValuesRating: z.record(z.unknown()).optional(),
  rightPersonRightSeat: z.enum(["right", "wrong", "unsure"]).optional(),
  notes: z.string().max(5000).optional(),
})

export const vtoUpsertSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  coreValues: z.array(z.string()).optional(),
  coreFocus: z.record(z.unknown()).optional(),
  tenYearTarget: z.record(z.unknown()).optional(),
  marketingStrategy: z.record(z.unknown()).optional(),
  threeYearPicture: z.record(z.unknown()).optional(),
  oneYearPlan: z.record(z.unknown()).optional(),
  quarterlyRocks: z.array(z.string()).optional(),
  issuesList: z.array(z.string()).optional(),
  lastEditedBy: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
})

export const taskTemplateCreateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(200),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  priority: prioritySchema.default("normal"),
  defaultRockId: z.string().optional(),
  recurrence: recurrenceSchema.optional(),
  isShared: z.boolean().default(false),
  workspaceId: z.string().optional(),
})

export const workspaceFeaturesUpdateSchema = z.object({
  features: z.record(z.record(z.boolean())),
})

export const bulkRockCreateSchema = z.object({
  rocks: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    milestones: z.array(z.string()).optional(),
    quarter: z.string().optional(),
    dueDate: z.string().optional(),
  })).min(1, "At least one rock is required").max(50),
  userId: z.string().min(1, "User ID is required"),
  metrics: z.array(z.object({
    assigneeName: z.string(),
    metricName: z.string(),
    weeklyGoal: z.number(),
  })).optional(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    priority: z.string().optional().default("medium"),
    dueDate: z.string().optional(),
    rockTitle: z.string().optional(),
  })).optional(),
  workspaceId: z.string().optional(),
})

export const orgChartChatSchema = z.object({
  message: z.string().min(1, "Message is required").max(50000),
  workspaceId: z.string().min(1, "workspaceId is required"),
})

export const orgChartProgressSchema = z.object({
  employeeName: z.string().min(1, "Employee name is required"),
  rockIndex: z.number().int().min(0),
  bulletIndex: z.number().int().min(0),
  completed: z.boolean(),
  updatedBy: z.string().optional(),
})

export const orgChartSyncRocksSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
})

export const maEmployeeCreateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  supervisor: z.string().max(200).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  responsibilities: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  email: z.string().email().nullable().optional(),
  workspaceId: z.string().min(1, "workspaceId is required"),
})

export const maEmployeeUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  supervisor: z.string().max(200).nullable().optional(),
  department: z.string().max(100).nullable().optional(),
  jobTitle: z.string().max(200).nullable().optional(),
  responsibilities: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  email: z.string().email().nullable().optional(),
  isActive: z.boolean().optional(),
})

export const userCreateOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required").max(100),
})

export const streakUpdateSchema = z.object({
  date: dateSchema.optional(),
})

export const auditSummarySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
})

export const firecrawlScrapeSchema = z.object({
  url: z.string().min(1, "URL is required").max(2048),
})

export const orgChartEmployeeRocksSchema = z.object({
  rocks: z.string(),
})

export const crossWorkspaceTaskCreateSchema = z.object({
  targetOrganizationId: z.string().min(1, "Target organization ID is required"),
  title: z.string().min(2, "Task title is required (min 2 characters)").max(500),
  description: z.string().max(5000).optional(),
  priority: prioritySchema.default("normal"),
  assigneeId: z.string().optional(),
  dueDate: dateSchema.optional(),
})

// ============================================
// CLIENT SCHEMAS
// ============================================

export const clientStatusSchema = z.enum(["active", "inactive", "prospect", "archived"])

export const createClientSchema = z.object({
  name: z.string().min(1, "Client name is required").max(255).trim(),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  description: z.string().max(2000).trim().optional(),
  contactName: z.string().max(255).trim().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().max(100).trim().optional(),
  website: z.string().url("Invalid URL").max(500).optional().or(z.literal("")),
  industry: z.string().max(255).trim().optional(),
  status: clientStatusSchema.optional(),
  notes: z.string().max(5000).trim().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const updateClientSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).trim().optional().nullable(),
  contactName: z.string().max(255).trim().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().max(100).trim().optional().nullable(),
  website: z.string().url().max(500).optional().nullable().or(z.literal("")),
  industry: z.string().max(255).trim().optional().nullable(),
  status: clientStatusSchema.optional(),
  notes: z.string().max(5000).trim().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

// ============================================
// PROJECT SCHEMAS
// ============================================

export const projectStatusSchema = z.enum(["planning", "active", "on-hold", "completed", "cancelled"])
export const projectPrioritySchema = z.enum(["high", "medium", "normal", "low"])

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255).trim(),
  workspaceId: z.string().min(1, "Workspace ID is required"),
  clientId: z.string().optional().nullable(),
  description: z.string().max(5000).trim().optional(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const updateProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255).trim().optional(),
  clientId: z.string().optional().nullable(),
  description: z.string().max(5000).trim().optional().nullable(),
  status: projectStatusSchema.optional(),
  priority: projectPrioritySchema.optional(),
  startDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  budgetCents: z.number().int().min(0).optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export const projectMemberSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["owner", "lead", "member", "viewer"]).optional(),
})

// ============================================
// TYPE EXPORTS - NEW SCHEMAS
// ============================================

export type AIBrainDumpInput = z.infer<typeof aiBrainDumpSchema>
export type AIQueryRequestInput = z.infer<typeof aiQueryRequestSchema>
export type AIEodParseInput = z.infer<typeof aiEodParseSchema>
export type AIDigestInput = z.infer<typeof aiDigestSchema>
export type AISlackNotificationInput = z.infer<typeof aiSlackNotificationSchema>
export type AITaskPatchInput = z.infer<typeof aiTaskPatchSchema>
export type AIBulkSuggestionInput = z.infer<typeof aiBulkSuggestionSchema>
export type AIPrioritizeInput = z.infer<typeof aiPrioritizeSchema>
export type AIMeetingNotesInput = z.infer<typeof aiMeetingNotesSchema>
export type AIManagerInsightsInput = z.infer<typeof aiManagerInsightsSchema>
export type AIMeetingPrepInput = z.infer<typeof aiMeetingPrepSchema>
export type AIScorecardInsightsInput = z.infer<typeof aiScorecardInsightsSchema>
export type RockParseInput = z.infer<typeof rockParseSchema>
export type MetricsCreateInput = z.infer<typeof metricsCreateSchema>
export type AsanaSyncInput = z.infer<typeof asanaSyncSchema>
export type AsanaConnectInput = z.infer<typeof asanaConnectSchema>
export type PeopleAssessmentCreateInput = z.infer<typeof peopleAssessmentCreateSchema>
export type PeopleAssessmentUpdateInput = z.infer<typeof peopleAssessmentUpdateSchema>
export type VtoUpsertInput = z.infer<typeof vtoUpsertSchema>
export type TaskTemplateCreateInput = z.infer<typeof taskTemplateCreateSchema>
export type WorkspaceFeaturesUpdateInput = z.infer<typeof workspaceFeaturesUpdateSchema>
export type BulkRockCreateInput = z.infer<typeof bulkRockCreateSchema>
export type OrgChartChatInput = z.infer<typeof orgChartChatSchema>
export type OrgChartProgressInput = z.infer<typeof orgChartProgressSchema>
export type OrgChartSyncRocksInput = z.infer<typeof orgChartSyncRocksSchema>
export type MaEmployeeCreateInput = z.infer<typeof maEmployeeCreateSchema>
export type MaEmployeeUpdateInput = z.infer<typeof maEmployeeUpdateSchema>
export type UserCreateOrganizationInput = z.infer<typeof userCreateOrganizationSchema>
export type StreakUpdateInput = z.infer<typeof streakUpdateSchema>
export type AuditSummaryInput = z.infer<typeof auditSummarySchema>
export type FirecrawlScrapeInput = z.infer<typeof firecrawlScrapeSchema>
export type OrgChartEmployeeRocksInput = z.infer<typeof orgChartEmployeeRocksSchema>
export type CrossWorkspaceTaskCreateInput = z.infer<typeof crossWorkspaceTaskCreateSchema>
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
export type ProjectMemberInput = z.infer<typeof projectMemberSchema>

// ============================================
// ADMIN / SUPER-ADMIN SCHEMAS
// ============================================

export const adminEmailLookupSchema = z.object({
  email: emailSchema,
})

export const bugReportSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters").max(5000).trim(),
  page: z.string().max(500).trim().optional(),
  url: z.string().max(1000).trim().optional(),
  userAgent: z.string().max(500).trim().optional(),
  timestamp: z.string().max(100).optional(),
})

export const createOrgSchema = z.object({
  name: z.string().min(1, "Organization name is required").max(255).trim(),
  logoUrl: z.string().url("Invalid logo URL").max(1000).optional().or(z.literal("")),
})

export const publicEodTokenActionSchema = z.object({
  action: z.enum(["generate", "clear"], { message: "action must be 'generate' or 'clear'" }),
})

export const consolidateAccountSchema = z.object({
  oldUserEmail: emailSchema,
})

// ============================================
// TASK POOL SCHEMAS
// ============================================

export const createTaskPoolItemSchema = z.object({
  title: z.string().min(1, "Title required").max(500),
  description: z.string().max(2000).optional(),
  priority: z.enum(["high", "medium", "normal"]).default("normal"),
  workspaceId: z.string().min(1, "Workspace required"),
})

export const claimTaskPoolItemSchema = z.object({
  action: z.enum(["claim", "unclaim"]),
  workspaceId: z.string().min(1, "Workspace required"),
})

// ============================================
// WORKSPACE INVITE LINK SCHEMAS
// ============================================

export const joinWorkspaceSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).trim().optional(),
  email: emailSchema,
  password: passwordSchema.optional(),
})

// ============================================
// CLIENT PORTAL SCHEMAS
// ============================================

export const clientPortalTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200).trim(),
  description: z.string().max(1000).trim().optional(),
})

export const clientPortalCommentSchema = z.object({
  reportId: z.string().min(1, "Report ID is required"),
  content: z.string().min(1, "Comment cannot be empty").max(2000).trim(),
})

export const updateClientPortalSchema = z.object({
  portalEnabled: z.boolean().optional(),
  portalMemberFilter: z.array(z.string()).nullable().optional(),
  regenerateToken: z.boolean().optional(),
})

// ============================================
// QUICK WORKSPACE SETUP SCHEMA
// ============================================

export const quickSetupSchema = z.object({
  orgName: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable().optional(),
  rocks: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().max(2000).optional(),
    milestones: z.array(z.string().max(200)).max(50).optional(),
    quarter: z.string().max(20).optional(),
  })).max(50).optional(),
  tasks: z.array(z.object({
    title: z.string().min(1).max(500),
    rockTitle: z.string().max(500).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueDate: z.string().optional(),
  })).max(200).optional(),
  invites: z.array(z.object({
    email: z.string().email(),
    role: z.enum(["admin", "member"]),
  })).max(20).optional(),
})

export type QuickSetupInput = z.infer<typeof quickSetupSchema>

// ============================================
// ONE-ON-ONE SCHEMAS
// ============================================

export const oneOnOnePrepSchema = z.object({
  reportId: z.string().min(1, "reportId is required"),
  workspaceId: z.string().min(1, "workspaceId is required"),
  oneOnOneId: z.string().optional(),
})

export const updateOneOnOneSchema = z.object({
  notes: z.string().max(10000).optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional(),
  talkingPoints: z.array(z.record(z.unknown())).max(100).optional(),
  actionItems: z.array(z.record(z.unknown())).max(100).optional(),
  rating: z.number().int().min(1).max(10).optional(),
  completedAt: z.string().optional(),
})

export type OneOnOnePrepInput = z.infer<typeof oneOnOnePrepSchema>
export type UpdateOneOnOneInput = z.infer<typeof updateOneOnOneSchema>

// ============================================
// COMPANY DIGEST UPDATE SCHEMA
// ============================================

export const updateCompanyDigestSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  content: z.record(z.unknown()).optional(),
})

export type UpdateCompanyDigestInput = z.infer<typeof updateCompanyDigestSchema>
