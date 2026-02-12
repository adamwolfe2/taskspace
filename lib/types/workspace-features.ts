/**
 * Workspace Feature Toggles System
 *
 * Allows workspace admins to selectively enable/disable features per workspace.
 * All features are enabled by default for backward compatibility.
 */

// ============================================
// FEATURE TOGGLE INTERFACE
// ============================================

export interface WorkspaceFeatureToggles {
  core: {
    tasks: boolean
    rocks: boolean
    eodReports: boolean
    scorecard: boolean
    meetings: boolean
    ids: boolean
    orgChart: boolean
    notes: boolean
    vto: boolean
    peopleAnalyzer: boolean
    projects: boolean
    clients: boolean
  }
  productivity: {
    focusBlocks: boolean
    dailyEnergy: boolean
    streakTracking: boolean
    weeklyReviews: boolean
    achievements: boolean
  }
  integrations: {
    asana: boolean
    googleCalendar: boolean
    slack: boolean
    webhooks: boolean
  }
  advanced: {
    aiCommandCenter: boolean
    analytics: boolean
    managerDashboard: boolean
    apiAccess: boolean
  }
  admin: {
    teamManagement: boolean
    databaseManagement: boolean
    branding: boolean
  }
}

// ============================================
// FEATURE KEY TYPE
// ============================================

export type WorkspaceFeatureKey =
  | `core.${keyof WorkspaceFeatureToggles['core']}`
  | `productivity.${keyof WorkspaceFeatureToggles['productivity']}`
  | `integrations.${keyof WorkspaceFeatureToggles['integrations']}`
  | `advanced.${keyof WorkspaceFeatureToggles['advanced']}`
  | `admin.${keyof WorkspaceFeatureToggles['admin']}`

// ============================================
// DEFAULT FEATURES (ALL ENABLED)
// ============================================

export const DEFAULT_WORKSPACE_FEATURES: WorkspaceFeatureToggles = {
  core: {
    tasks: true,
    rocks: true,
    eodReports: true,
    scorecard: true,
    meetings: true,
    ids: true,
    orgChart: true,
    notes: true,
    vto: true,
    peopleAnalyzer: true,
    projects: true,
    clients: true,
  },
  productivity: {
    focusBlocks: true,
    dailyEnergy: true,
    streakTracking: true,
    weeklyReviews: true,
    achievements: true,
  },
  integrations: {
    asana: true,
    googleCalendar: true,
    slack: true,
    webhooks: true,
  },
  advanced: {
    aiCommandCenter: true,
    analytics: true,
    managerDashboard: true,
    apiAccess: true,
  },
  admin: {
    teamManagement: true,
    databaseManagement: true,
    branding: true,
  },
}

// ============================================
// FEATURE METADATA
// ============================================

export interface WorkspaceFeatureMetadata {
  name: string
  description: string
  category: keyof WorkspaceFeatureToggles
  icon: string
  dependencies?: WorkspaceFeatureKey[]
  requiredOrgFeature?: string // Maps to org-level feature from feature-gate.ts
  impact: {
    navigation?: boolean // Affects sidebar navigation
    dashboard?: boolean // Affects dashboard widgets
    api?: boolean // Affects API endpoints
  }
}

export const WORKSPACE_FEATURE_METADATA: Record<WorkspaceFeatureKey, WorkspaceFeatureMetadata> = {
  // Core Features
  "core.tasks": {
    name: "Task Management",
    description: "Create, assign, and track tasks with due dates and priorities",
    category: "core",
    icon: "CheckSquare",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "core.rocks": {
    name: "Quarterly Rocks",
    description: "Set and track quarterly goals (rocks) for team members",
    category: "core",
    icon: "Target",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "core.eodReports": {
    name: "End of Day Reports",
    description: "Daily progress reports and team updates",
    category: "core",
    icon: "FileText",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "core.scorecard": {
    name: "Scorecard Metrics",
    description: "Track key performance indicators and team metrics",
    category: "core",
    icon: "BarChart3",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "core.meetings": {
    name: "Meeting Management",
    description: "Schedule meetings, track agendas, and record notes",
    category: "core",
    icon: "Calendar",
    dependencies: ["core.rocks", "core.tasks", "core.ids"],
    impact: { navigation: true, dashboard: true, api: true },
  },
  "core.ids": {
    name: "Issue Tracking (IDS)",
    description: "Identify, discuss, and solve team issues",
    category: "core",
    icon: "AlertCircle",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "core.orgChart": {
    name: "Organization Chart",
    description: "Visual hierarchy and team structure",
    category: "core",
    icon: "Network",
    impact: { navigation: true, dashboard: false, api: true },
  },
  "core.notes": {
    name: "Workspace Notes",
    description: "Collaborative Notion-style notes shared across the workspace",
    category: "core",
    icon: "FileText",
    impact: { navigation: true, dashboard: false, api: true },
  },
  "core.vto": {
    name: "V/TO (Vision/Traction Organizer)",
    description: "Define and track your company vision, core values, and strategic plan",
    category: "core",
    icon: "BookOpen",
    impact: { navigation: true, dashboard: false, api: true },
  },
  "core.peopleAnalyzer": {
    name: "People Analyzer (GWC)",
    description: "Assess team members on Gets It, Wants It, and Capacity to Do It",
    category: "core",
    icon: "UserCheck",
    dependencies: ["core.orgChart"],
    impact: { navigation: true, dashboard: false, api: true },
  },

  "core.projects": {
    name: "Projects",
    description: "Track and manage projects with kanban boards, team members, and task attribution",
    category: "core",
    icon: "FolderKanban",
    dependencies: ["core.tasks"],
    impact: { navigation: true, dashboard: true, api: true },
  },
  "core.clients": {
    name: "Clients",
    description: "Manage client relationships, link projects to clients, and track client attribution",
    category: "core",
    icon: "Building2",
    dependencies: ["core.projects"],
    impact: { navigation: true, dashboard: true, api: true },
  },

  // Productivity Features
  "productivity.focusBlocks": {
    name: "Focus Blocks",
    description: "Time-blocking and deep work sessions",
    category: "productivity",
    icon: "Clock",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "productivity.dailyEnergy": {
    name: "Daily Energy Tracking",
    description: "Track energy levels throughout the day",
    category: "productivity",
    icon: "Zap",
    impact: { navigation: false, dashboard: true, api: true },
  },
  "productivity.streakTracking": {
    name: "Streak Tracking",
    description: "Track consecutive days of EOD report completion",
    category: "productivity",
    icon: "Flame",
    dependencies: ["core.eodReports"],
    impact: { navigation: false, dashboard: true, api: false },
  },
  "productivity.weeklyReviews": {
    name: "Weekly Reviews",
    description: "Structured weekly reflection and planning",
    category: "productivity",
    icon: "Calendar",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "productivity.achievements": {
    name: "Achievements & Badges",
    description: "Gamification and milestone celebrations",
    category: "productivity",
    icon: "Award",
    impact: { navigation: false, dashboard: true, api: false },
  },

  // Integration Features
  "integrations.asana": {
    name: "Asana Integration",
    description: "Sync tasks and projects with Asana",
    category: "integrations",
    icon: "Link",
    requiredOrgFeature: "api_access",
    impact: { navigation: false, dashboard: false, api: true },
  },
  "integrations.googleCalendar": {
    name: "Google Calendar",
    description: "Sync meetings and events with Google Calendar",
    category: "integrations",
    icon: "Calendar",
    requiredOrgFeature: "api_access",
    impact: { navigation: false, dashboard: false, api: true },
  },
  "integrations.slack": {
    name: "Slack Integration",
    description: "Send notifications and updates to Slack",
    category: "integrations",
    icon: "MessageSquare",
    requiredOrgFeature: "email_notifications",
    impact: { navigation: false, dashboard: false, api: true },
  },
  "integrations.webhooks": {
    name: "Custom Webhooks",
    description: "Trigger external systems with custom webhooks",
    category: "integrations",
    icon: "Webhook",
    requiredOrgFeature: "api_access",
    impact: { navigation: false, dashboard: false, api: true },
  },

  // Advanced Features
  "advanced.aiCommandCenter": {
    name: "AI Command Center",
    description: "AI-powered insights and automation",
    category: "advanced",
    icon: "Bot",
    requiredOrgFeature: "ai_insights",
    impact: { navigation: true, dashboard: true, api: true },
  },
  "advanced.analytics": {
    name: "Advanced Analytics",
    description: "Deep-dive charts and performance analysis",
    category: "advanced",
    icon: "TrendingUp",
    requiredOrgFeature: "advanced_analytics",
    dependencies: ["core.tasks", "core.rocks"],
    impact: { navigation: true, dashboard: true, api: true },
  },
  "advanced.managerDashboard": {
    name: "Manager Dashboard",
    description: "Aggregated team view for managers",
    category: "advanced",
    icon: "LayoutDashboard",
    requiredOrgFeature: "advanced_analytics",
    impact: { navigation: true, dashboard: false, api: true },
  },
  "advanced.apiAccess": {
    name: "API Access",
    description: "Programmatic access to workspace data",
    category: "advanced",
    icon: "Code",
    requiredOrgFeature: "api_access",
    impact: { navigation: false, dashboard: false, api: true },
  },

  // Admin Features
  "admin.teamManagement": {
    name: "Team Management",
    description: "Add, remove, and manage team members",
    category: "admin",
    icon: "Users",
    impact: { navigation: true, dashboard: false, api: true },
  },
  "admin.databaseManagement": {
    name: "Database Management",
    description: "Direct database access and migrations",
    category: "admin",
    icon: "Database",
    requiredOrgFeature: "api_access",
    impact: { navigation: true, dashboard: false, api: true },
  },
  "admin.branding": {
    name: "Custom Branding",
    description: "Customize workspace logo, colors, and theme",
    category: "admin",
    icon: "Palette",
    requiredOrgFeature: "custom_branding",
    impact: { navigation: false, dashboard: false, api: true },
  },
}

// ============================================
// FEATURE CATEGORIES METADATA
// ============================================

export const FEATURE_CATEGORIES = {
  core: {
    name: "Core Features",
    description: "Essential features for day-to-day operations",
    icon: "Layers",
  },
  productivity: {
    name: "Productivity Tools",
    description: "Features to enhance individual and team productivity",
    icon: "Zap",
  },
  integrations: {
    name: "Integrations",
    description: "Connect with external tools and services",
    icon: "Link",
  },
  advanced: {
    name: "Advanced Features",
    description: "AI-powered and advanced analytics capabilities",
    icon: "Sparkles",
  },
  admin: {
    name: "Administration",
    description: "Workspace configuration and management",
    icon: "Settings",
  },
} as const

// ============================================
// HELPER TYPES
// ============================================

export interface FeatureValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface FeatureToggleConfig {
  enabled: boolean
  reason?: string // Why feature is disabled (e.g., "Requires Professional plan")
}

export type WorkspaceFeatureConfig = {
  [K in WorkspaceFeatureKey]: FeatureToggleConfig
}
