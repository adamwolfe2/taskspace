/**
 * Environment Variable Validation
 * Validates required environment variables at startup to prevent silent failures
 */

type EnvVarConfig = {
  required: boolean
  description: string
  example?: string
  validate?: (value: string) => boolean
}

type FeatureEnvVars = {
  name: string
  description: string
  vars: Record<string, EnvVarConfig>
}

// Core environment variables - always required
const CORE_VARS: FeatureEnvVars = {
  name: "Core",
  description: "Essential for application to run",
  vars: {
    POSTGRES_URL: {
      required: true,
      description: "PostgreSQL database connection string",
      example: "postgres://user:pass@host:5432/db",
    },
  },
}

// Stripe billing environment variables
const BILLING_VARS: FeatureEnvVars = {
  name: "Billing (Stripe)",
  description: "Payment processing and subscription management",
  vars: {
    STRIPE_SECRET_KEY: {
      required: false,
      description: "Stripe secret API key",
      example: "sk_live_...",
      validate: (v) => v.startsWith("sk_"),
    },
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: {
      required: false,
      description: "Stripe publishable key (exposed to client)",
      example: "pk_live_...",
      validate: (v) => v.startsWith("pk_"),
    },
    STRIPE_WEBHOOK_SECRET: {
      required: false,
      description: "Stripe webhook signing secret",
      example: "whsec_...",
      validate: (v) => v.startsWith("whsec_"),
    },
    STRIPE_PRICE_STARTER_MONTHLY: {
      required: false,
      description: "Stripe price ID for Starter plan (monthly)",
      example: "price_...",
    },
    STRIPE_PRICE_STARTER_YEARLY: {
      required: false,
      description: "Stripe price ID for Starter plan (yearly)",
      example: "price_...",
    },
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: {
      required: false,
      description: "Stripe price ID for Professional plan (monthly)",
      example: "price_...",
    },
    STRIPE_PRICE_PROFESSIONAL_YEARLY: {
      required: false,
      description: "Stripe price ID for Professional plan (yearly)",
      example: "price_...",
    },
    STRIPE_PRICE_ENTERPRISE_MONTHLY: {
      required: false,
      description: "Stripe price ID for Enterprise plan (monthly)",
      example: "price_...",
    },
    STRIPE_PRICE_ENTERPRISE_YEARLY: {
      required: false,
      description: "Stripe price ID for Enterprise plan (yearly)",
      example: "price_...",
    },
  },
}

// Email environment variables
const EMAIL_VARS: FeatureEnvVars = {
  name: "Email (Resend)",
  description: "Email notifications and reminders",
  vars: {
    RESEND_API_KEY: {
      required: false,
      description: "Resend API key for sending emails",
      example: "re_...",
      validate: (v) => v.startsWith("re_"),
    },
    EMAIL_FROM: {
      required: false,
      description: "Default from email address",
      example: "Taskspace <noreply@example.com>",
    },
  },
}

// AI features environment variables
const AI_VARS: FeatureEnvVars = {
  name: "AI (Anthropic)",
  description: "AI-powered insights and analysis",
  vars: {
    ANTHROPIC_API_KEY: {
      required: false,
      description: "Anthropic API key for Claude AI",
      example: "sk-ant-...",
      validate: (v) => v.startsWith("sk-ant-"),
    },
  },
}

// Google Calendar integration
const GOOGLE_VARS: FeatureEnvVars = {
  name: "Google Calendar",
  description: "Calendar integration for syncing events",
  vars: {
    GOOGLE_CLIENT_ID: {
      required: false,
      description: "Google OAuth client ID",
      example: "xxx.apps.googleusercontent.com",
    },
    GOOGLE_CLIENT_SECRET: {
      required: false,
      description: "Google OAuth client secret",
    },
    GOOGLE_REDIRECT_URI: {
      required: false,
      description: "OAuth callback URL",
      example: "https://app.example.com/api/google-calendar/callback",
    },
  },
}

// Push notifications
const PUSH_VARS: FeatureEnvVars = {
  name: "Push Notifications",
  description: "Browser push notifications",
  vars: {
    VAPID_PUBLIC_KEY: {
      required: false,
      description: "VAPID public key for web push",
    },
    VAPID_PRIVATE_KEY: {
      required: false,
      description: "VAPID private key for web push",
    },
  },
}

// Application URLs
const APP_VARS: FeatureEnvVars = {
  name: "Application",
  description: "General application configuration",
  vars: {
    NEXT_PUBLIC_APP_URL: {
      required: false,
      description: "Public URL of the application",
      example: "https://app.example.com",
      validate: (v) => v.startsWith("http://") || v.startsWith("https://"),
    },
    NODE_ENV: {
      required: false,
      description: "Node environment (development, production, test)",
      validate: (v) => ["development", "production", "test"].includes(v),
    },
  },
}

// All feature groups
const ALL_FEATURES: FeatureEnvVars[] = [
  CORE_VARS,
  BILLING_VARS,
  EMAIL_VARS,
  AI_VARS,
  GOOGLE_VARS,
  PUSH_VARS,
  APP_VARS,
]

type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
  features: {
    name: string
    enabled: boolean
    missing: string[]
  }[]
}

/**
 * Validate all environment variables
 */
export function validateEnv(): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const features: ValidationResult["features"] = []

  for (const feature of ALL_FEATURES) {
    const missing: string[] = []
    let featureEnabled = true

    for (const [varName, config] of Object.entries(feature.vars)) {
      const value = process.env[varName]

      if (!value) {
        if (config.required) {
          errors.push(`Missing required env var: ${varName} - ${config.description}`)
          featureEnabled = false
        } else {
          missing.push(varName)
        }
      } else if (config.validate && !config.validate(value)) {
        warnings.push(`Invalid format for ${varName}: expected ${config.example || "valid format"}`)
      }
    }

    // Check if feature has any vars set (partially configured)
    const featureVars = Object.keys(feature.vars)
    const setVars = featureVars.filter((v) => !!process.env[v])
    const unsetVars = featureVars.filter((v) => !process.env[v])

    if (setVars.length > 0 && unsetVars.length > 0 && feature.name !== "Application") {
      // Partially configured feature - warn about missing vars
      warnings.push(
        `${feature.name}: Partially configured. Set: ${setVars.join(", ")}. Missing: ${unsetVars.join(", ")}`
      )
    }

    features.push({
      name: feature.name,
      enabled: setVars.length === featureVars.length || (feature.name === "Core" && errors.length === 0),
      missing,
    })
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    features,
  }
}

/**
 * Validate environment and throw if critical vars are missing
 * Call this at application startup
 */
export function assertEnv(): void {
  const result = validateEnv()

  if (!result.valid) {
    const errorMessage = [
      "❌ Environment validation failed!",
      "",
      "Missing required environment variables:",
      ...result.errors.map((e) => `  • ${e}`),
      "",
      "Please add these to your .env or .env.local file.",
    ].join("\n")

    // Use stderr directly since logger may not be initialized yet
    process.stderr?.write?.(errorMessage + "\n")
    throw new Error(`Environment validation failed: ${result.errors.join(", ")}`)
  }

  // Log warnings in development
  if (process.env.NODE_ENV === "development" && result.warnings.length > 0) {
    process.stderr?.write?.("Environment warnings:\n")
    result.warnings.forEach((w) => process.stderr?.write?.(`  - ${w}\n`))
  }
}

/**
 * Get environment status for health checks
 */
export function getEnvStatus(): {
  valid: boolean
  features: { name: string; enabled: boolean }[]
} {
  const result = validateEnv()
  return {
    valid: result.valid,
    features: result.features.map((f) => ({
      name: f.name,
      enabled: f.enabled,
    })),
  }
}

/**
 * Check if a specific feature is configured
 */
export function isFeatureConfigured(featureName: string): boolean {
  const result = validateEnv()
  const feature = result.features.find((f) => f.name === featureName)
  return feature?.enabled ?? false
}

// Type-safe environment variable access
export const env = {
  // Core
  get DATABASE_URL() {
    return process.env.POSTGRES_URL!
  },
  get NODE_ENV() {
    return (process.env.NODE_ENV as "development" | "production" | "test") || "development"
  },
  get isProduction() {
    return this.NODE_ENV === "production"
  },
  get isDevelopment() {
    return this.NODE_ENV === "development"
  },

  // App
  get APP_URL() {
    return process.env.NEXT_PUBLIC_APP_URL || (this.isDevelopment ? "http://localhost:3000" : "https://www.trytaskspace.com")
  },

  // Stripe
  get STRIPE_SECRET_KEY() {
    return process.env.STRIPE_SECRET_KEY
  },
  get STRIPE_PUBLISHABLE_KEY() {
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  },
  get STRIPE_WEBHOOK_SECRET() {
    return process.env.STRIPE_WEBHOOK_SECRET
  },
  get stripeConfigured() {
    return !!(this.STRIPE_SECRET_KEY && this.STRIPE_PUBLISHABLE_KEY)
  },

  // Email
  get RESEND_API_KEY() {
    return process.env.RESEND_API_KEY
  },
  get EMAIL_FROM() {
    return process.env.EMAIL_FROM || "Taskspace <noreply@trytaskspace.com>"
  },
  get emailConfigured() {
    return !!this.RESEND_API_KEY
  },

  // AI
  get ANTHROPIC_API_KEY() {
    return process.env.ANTHROPIC_API_KEY
  },
  get aiConfigured() {
    return !!this.ANTHROPIC_API_KEY
  },

  // Google Calendar
  get GOOGLE_CLIENT_ID() {
    return process.env.GOOGLE_CLIENT_ID
  },
  get GOOGLE_CLIENT_SECRET() {
    return process.env.GOOGLE_CLIENT_SECRET
  },
  get googleCalendarConfigured() {
    return !!(this.GOOGLE_CLIENT_ID && this.GOOGLE_CLIENT_SECRET)
  },

  // Push notifications
  get VAPID_PUBLIC_KEY() {
    return process.env.VAPID_PUBLIC_KEY
  },
  get VAPID_PRIVATE_KEY() {
    return process.env.VAPID_PRIVATE_KEY
  },
  get pushConfigured() {
    return !!(this.VAPID_PUBLIC_KEY && this.VAPID_PRIVATE_KEY)
  },
}

// Export for testing
export const _testing = {
  ALL_FEATURES,
  CORE_VARS,
  BILLING_VARS,
}
