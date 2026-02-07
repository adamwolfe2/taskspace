/**
 * Centralized configuration for Taskspace
 * All magic numbers and hardcoded values should be defined here
 */

// Product branding (easy to update when rebranding)
export const PRODUCT_CONFIG = {
  name: "Taskspace",
  tagline: "Team Productivity Platform",
  description: "Transform how your team tracks progress and achieves goals with AI-powered accountability tools",
  domain: "trytaskspace.com",
  supportEmail: "support@trytaskspace.com",
  company: "Taskspace",
} as const

export const CONFIG = {
  // Authentication settings
  auth: {
    sessionDurationDays: 7,
    inviteExpirationDays: 7,
    passwordResetExpirationHours: 1,
    passwordMinLength: 8,
    bcryptRounds: 12,
  },

  // Rate limiting settings
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxLoginAttempts: 5,
    maxRegisterAttempts: 3,
    maxPasswordResetAttempts: 3,
  },

  // Subscription/Plan defaults
  subscription: {
    trialDays: 30,
    freePlanMaxUsers: 5,
    starterPlanMaxUsers: 15,
    professionalPlanMaxUsers: 50,
    enterprisePlanMaxUsers: Infinity,
  },

  // Organization defaults
  organization: {
    defaultTimezone: "America/New_York",
    defaultWeekStartDay: 1 as 0 | 1 | 2 | 3 | 4 | 5 | 6, // Monday
    defaultEodReminderTime: "17:00",
    defaultDepartment: "General",
  },

  // Feature flags
  features: {
    enableEmailNotifications: true,
    enableSlackIntegration: true, // Slack webhook integration enabled
    enableTwoFactorAuth: false, // Coming soon
    enable2FA: false,
  },

  // UI settings
  ui: {
    paginationLimit: 20,
    maxFileUploadSizeMB: 5,
    avatarMaxSizeMB: 2,
  },

  // API timeouts (in milliseconds)
  api: {
    defaultTimeout: 10000, // 10 seconds
    uploadTimeout: 60000, // 60 seconds
    retryAttempts: 3,
    retryDelayMs: 1000,
  },

  // Session update settings
  session: {
    // Only update lastActiveAt every 5 minutes to reduce write load
    activityUpdateIntervalMs: 5 * 60 * 1000,
  },
} as const

// Environment-specific configuration
export const ENV = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://www.trytaskspace.com"),
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
} as const

/**
 * Calculate a future expiration date from now
 * @param hours - Number of hours until expiration
 * @returns ISO 8601 date string
 * @example getExpirationDate(24) // 24 hours from now
 */
export function getExpirationDate(hours: number): string {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

/**
 * Calculate a future expiration date from now (in days)
 * @param days - Number of days until expiration
 * @returns ISO 8601 date string
 * @example getExpirationDateDays(7) // 1 week from now
 */
export function getExpirationDateDays(days: number): string {
  return getExpirationDate(days * 24)
}
