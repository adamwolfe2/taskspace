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

export const uuidSchema = z.string().uuid("Invalid ID format")

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

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1).default(["read"]),
})

// ============================================
// ORGANIZATION SCHEMAS
// ============================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  settings: z
    .object({
      timezone: z.string().default("America/New_York"),
      weekStartDay: z.number().int().min(0).max(6).default(0),
      eodReminderTime: z.string().regex(/^\d{2}:\d{2}$/).default("17:00"),
      enableEmailNotifications: z.boolean().default(true),
      enableSlackIntegration: z.boolean().default(false),
      slackWebhookUrl: z.string().url().optional(),
    })
    .optional(),
})

export const updateOrganizationSettingsSchema = z.object({
  timezone: z.string().optional(),
  weekStartDay: z.number().int().min(0).max(6).optional(),
  eodReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  enableEmailNotifications: z.boolean().optional(),
  enableSlackIntegration: z.boolean().optional(),
  slackWebhookUrl: z.string().url().nullable().optional(),
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
  memberId: uuidSchema, // Organization member ID to update
  role: z.enum(["admin", "member", "owner"]).optional(),
  department: z.string().min(1).max(100).optional(),
  weeklyMeasurable: z.string().max(500).optional(),
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
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  assigneeId: uuidSchema.optional(), // Optional - defaults to current user
  workspaceId: uuidSchema, // Required for data isolation
  priority: prioritySchema.default("normal"),
  dueDate: dateSchema.optional(), // Optional - defaults to today
  rockId: uuidSchema.nullable().optional(),
  recurrence: recurrenceSchema.optional(),
})

export const updateTaskSchema = z.object({
  id: uuidSchema, // Task ID to update
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  priority: prioritySchema.optional(),
  dueDate: dateSchema.optional(),
  status: taskStatusSchema.optional(),
  completedAt: isoDateSchema.nullable().optional(),
  rockId: uuidSchema.nullable().optional(),
  recurrence: recurrenceSchema.nullable().optional(),
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
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000), // Required per route validation
  userId: uuidSchema.optional(), // Optional - defaults to current user
  workspaceId: uuidSchema, // Required for data isolation
  dueDate: dateSchema,
  quarter: z.string().regex(/^Q[1-4] \d{4}$/).optional(),
  bucket: z.string().max(100).optional(),
  outcome: z.string().max(1000).optional(),
  doneWhen: z.array(z.string()).optional(), // Array of completion criteria
})

export const updateRockSchema = z.object({
  id: uuidSchema, // Rock ID to update
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  dueDate: dateSchema.optional(),
  status: rockStatusSchema.optional(),
  quarter: z.string().regex(/^Q[1-4] \d{4}$/).optional(),
  bucket: z.string().max(100).optional(),
  outcome: z.string().max(1000).optional(),
  doneWhen: z.array(z.string()).optional(),
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
  rockId: uuidSchema.nullable(),
  rockTitle: z.string().nullable(),
})

export const eodPrioritySchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(1000),
  rockId: uuidSchema.nullable(),
  rockTitle: z.string().nullable(),
})

export const createEODReportSchema = z.object({
  date: dateSchema,
  tasks: z.array(eodTaskSchema).min(1),
  challenges: z.string().max(5000).default(""),
  tomorrowPriorities: z.array(eodPrioritySchema),
  needsEscalation: z.boolean().default(false),
  escalationNote: z.string().max(2000).nullable().optional(),
})

export const updateEODReportSchema = z.object({
  tasks: z.array(eodTaskSchema).optional(),
  challenges: z.string().max(5000).optional(),
  tomorrowPriorities: z.array(eodPrioritySchema).optional(),
  needsEscalation: z.boolean().optional(),
  escalationNote: z.string().max(2000).nullable().optional(),
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
  metadata: z.record(z.unknown()).optional(),
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
  name: z.string().min(1, "Name is required").max(100),
  type: workspaceTypeSchema.default("team"),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  settings: z.record(z.unknown()).optional(),
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
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
  plan: z.enum(["starter", "professional", "enterprise"]),
  billingCycle: z.enum(["monthly", "yearly"]),
})

export const updateSubscriptionSchema = z.object({
  action: z.enum(["change_plan", "cancel", "resume", "portal"]),
  plan: z.enum(["starter", "professional", "enterprise"]).optional(),
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
export type TestEmailInput = z.infer<typeof testEmailSchema>
