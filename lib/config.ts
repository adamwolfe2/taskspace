/**
 * Centralized configuration for the AIMS Dashboard application
 * All magic numbers and hardcoded values should be defined here
 */

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
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  isProduction: process.env.NODE_ENV === "production",
  isDevelopment: process.env.NODE_ENV === "development",
} as const

// Get the expiration date for a given number of hours from now
export function getExpirationDate(hours: number): string {
  const date = new Date()
  date.setHours(date.getHours() + hours)
  return date.toISOString()
}

// Get the expiration date for a given number of days from now
export function getExpirationDateDays(days: number): string {
  return getExpirationDate(days * 24)
}
