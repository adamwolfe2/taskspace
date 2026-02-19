import type {
  ApiResponse,
  AuthResponse,
  TwoFactorPendingResponse,
  Organization,
  OrganizationSettings,
  OrganizationMember,
  Invitation,
  SafeInvitation,
  Rock,
  AssignedTask,
  EODReport,
  Notification,
  EODInsight,
  DailyDigest,
  UserOrganizationItem,
  SwitchOrganizationResponse,
  SubscriptionInfo,
  Client,
  Project,
  ProjectMember,
} from "@/lib/types"

/** Branding settings for an organization */
interface OrganizationBranding {
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  faviconUrl?: string
  customDomain?: string
}

/** Member update fields */
interface MemberUpdate {
  role?: "owner" | "admin" | "member"
  department?: string
  weeklyMeasurable?: string
  status?: "active" | "invited" | "pending" | "inactive"
  timezone?: string
  eodReminderTime?: string
  managerId?: string | null
  jobTitle?: string
}

/** Rock creation input */
interface RockCreateInput {
  title: string
  description?: string
  userId?: string
  dueDate?: string
  status?: Rock["status"]
  bucket?: string
  outcome?: string
  milestones?: Rock["milestones"]
  quarter?: string
  workspaceId?: string
}

/** Task creation input */
interface TaskCreateInput {
  title: string
  description?: string
  assigneeId: string
  assigneeName?: string
  rockId?: string | null
  projectId?: string | null
  priority?: AssignedTask["priority"]
  dueDate?: string | null
  workspaceId?: string
}

/** EOD report creation input */
interface EODReportCreateInput {
  date: string
  tasks: EODReport["tasks"]
  challenges: string
  tomorrowPriorities: EODReport["tomorrowPriorities"]
  needsEscalation: boolean
  escalationNote?: string | null
  metricValueToday?: number | null
  attachments?: EODReport["attachments"]
  workspaceId?: string
}

const API_BASE = "/api"

// ============================================
// ERROR CLASSES
// ============================================

class ApiError extends Error {
  status: number
  code?: string
  data?: unknown  // Include any data from the error response (e.g., existing report for 409)

  constructor(message: string, status: number, data?: unknown, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
    this.code = code
  }
}

// ============================================
// USER-FRIENDLY ERROR MESSAGES
// ============================================

const USER_FRIENDLY_MESSAGES: Record<number, string> = {
  400: "The request was invalid. Please check your input and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to perform this action.",
  404: "The requested resource was not found.",
  408: "The request timed out. Please try again.",
  409: "This conflicts with an existing record.",
  413: "The uploaded file is too large.",
  429: "You're making requests too quickly. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again later.",
  502: "Our servers are temporarily unavailable. Please try again in a moment.",
  503: "The service is temporarily unavailable. Please try again in a moment.",
  504: "The request timed out. Please try again.",
}

/**
 * Get a user-friendly error message for an HTTP status code.
 * Prefers the server-provided message if it looks user-friendly,
 * otherwise falls back to a generic message for the status code.
 */
function getUserFriendlyMessage(status: number, serverMessage?: string): string {
  // Special handling for CSRF errors - indicates stale browser cache
  if (serverMessage?.includes("Missing CSRF header")) {
    return "Your browser is using an outdated version. Please press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows) to reload, or clear your browser cache."
  }

  // If the server provided a message and it doesn't look like a raw error/stack trace, use it
  // Note: avoid "at " substring check — too broad, catches "at least", "at risk", etc.
  // Instead use a regex that matches actual JS stack trace lines ("  at Object.foo")
  if (
    serverMessage &&
    serverMessage.length < 200 &&
    !serverMessage.includes("Error:") &&
    !/\s+at\s+\S/.test(serverMessage) &&
    !serverMessage.includes("node_modules") &&
    !serverMessage.includes("ECONNREFUSED") &&
    !serverMessage.includes("relation") &&
    !serverMessage.includes("does not exist")
  ) {
    return serverMessage
  }

  return USER_FRIENDLY_MESSAGES[status] || "An unexpected error occurred. Please try again."
}

// ============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================

interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  retryableStatuses: number[]
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatuses: [429, 503],
}

/**
 * Calculate delay with exponential backoff and jitter.
 * For 429 responses, respects the Retry-After header if present.
 */
function calculateRetryDelay(
  attempt: number,
  config: RetryConfig,
  retryAfterHeader?: string | null
): number {
  // Respect Retry-After header if present (typically from 429 responses)
  if (retryAfterHeader) {
    const retryAfterSeconds = parseInt(retryAfterHeader, 10)
    if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
      return Math.min(retryAfterSeconds * 1000, config.maxDelayMs)
    }
  }

  // Exponential backoff: baseDelay * 2^attempt with jitter
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt)
  const jitter = Math.random() * config.baseDelayMs * 0.5
  return Math.min(exponentialDelay + jitter, config.maxDelayMs)
}

/**
 * Execute a fetch request with retry logic for transient failures.
 */
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  // Inject CSRF header for all API requests (prevents cross-origin forgery)
  const headers = new Headers(options?.headers)
  if (!headers.has("x-requested-with")) {
    headers.set("X-Requested-With", "XMLHttpRequest")
  }
  const mergedOptions = { ...options, headers }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, mergedOptions)

      // If the response is retryable and we haven't exhausted retries, wait and retry
      if (
        retryConfig.retryableStatuses.includes(response.status) &&
        attempt < retryConfig.maxRetries
      ) {
        const delay = calculateRetryDelay(
          attempt,
          retryConfig,
          response.headers.get("Retry-After")
        )
        console.warn(
          `[API Client] Request to ${url} returned ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Network errors are retryable
      if (attempt < retryConfig.maxRetries) {
        const delay = calculateRetryDelay(attempt, retryConfig)
        console.warn(
          `[API Client] Network error for ${url}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${retryConfig.maxRetries}):`,
          lastError.message
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }
    }
  }

  throw new ApiError(
    "Unable to reach the server. Please check your connection and try again.",
    0,
    undefined,
    "NETWORK_ERROR"
  )
}

// ============================================
// RESPONSE HANDLING
// ============================================

async function handleResponse<T>(response: Response): Promise<T> {
  let data: ApiResponse<T>

  try {
    data = await response.json()
  } catch {
    // Response body was not valid JSON
    throw new ApiError(
      getUserFriendlyMessage(response.status),
      response.status
    )
  }

  if (!response.ok || !data.success) {
    const friendlyMessage = getUserFriendlyMessage(response.status, data.error)
    throw new ApiError(friendlyMessage, response.status, data.data, data.code)
  }

  return data.data as T
}

// ============================================
// GLOBAL UNHANDLED PROMISE REJECTION HANDLER
// ============================================

/**
 * Initialize the global error toast handler.
 * Call this once in your app root to catch unhandled promise rejections
 * and display user-friendly toast notifications.
 *
 * Usage: import { initGlobalErrorHandler } from "@/lib/api/client"
 *        // In a useEffect in your root component:
 *        const cleanup = initGlobalErrorHandler()
 *        return cleanup
 */
export function initGlobalErrorHandler(): () => void {
  if (typeof window === "undefined") return () => {}

  const handler = (event: PromiseRejectionEvent) => {
    const error = event.reason

    // Only handle ApiErrors - other rejections should be handled by their callers
    if (error instanceof ApiError) {
      event.preventDefault()

      // Dynamically import toast to avoid circular dependencies
      import("@/hooks/use-toast").then(({ toast }) => {
        // For 401s, show a session expiration message
        if (error.status === 401) {
          toast({
            variant: "destructive",
            title: "Session Expired",
            description: "Please log in again to continue.",
          })
          return
        }

        // For 402s (Payment Required), show upgrade prompt
        if (error.status === 402) {
          toast({
            variant: "destructive",
            title: "Upgrade Required",
            description: (error.message || "This feature requires a paid plan.") + " Visit Settings → Billing to upgrade.",
          })
          return
        }

        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        })
      }).catch(() => {
        // Toast module not available, fall back to console
        console.error("[API Error]", error.message)
      })
    }

    // Log all unhandled rejections for debugging
    console.error("[Unhandled Promise Rejection]", error)
  }

  window.addEventListener("unhandledrejection", handler)
  return () => window.removeEventListener("unhandledrejection", handler)
}

export const api = {
  // Auth
  auth: {
    async login(email: string, password: string, organizationId?: string): Promise<AuthResponse | TwoFactorPendingResponse> {
      const response = await fetchWithRetry(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, organizationId }),
      })
      return handleResponse<AuthResponse | TwoFactorPendingResponse>(response)
    },

    async verify2FA(userId: string, code: string, organizationId?: string) {
      const response = await fetchWithRetry(`${API_BASE}/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code, organizationId }),
      })
      return handleResponse<AuthResponse>(response)
    },

    async register(email: string, password: string, name: string) {
      const response = await fetchWithRetry(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      })
      return handleResponse<AuthResponse>(response)
    },

    async logout() {
      const response = await fetchWithRetry(`${API_BASE}/auth/logout`, {
        method: "POST",
      })
      return handleResponse<null>(response)
    },

    async getSession() {
      const response = await fetchWithRetry(`${API_BASE}/auth/session`)
      return handleResponse<AuthResponse>(response)
    },
  },

  // Organizations
  organizations: {
    async list() {
      const response = await fetchWithRetry(`${API_BASE}/organizations`)
      return handleResponse<Organization[]>(response)
    },

    async create(name: string, timezone?: string) {
      const response = await fetchWithRetry(`${API_BASE}/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      })
      return handleResponse<Organization>(response)
    },

    async update(settings: Partial<Organization>) {
      const response = await fetchWithRetry(`${API_BASE}/organizations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      return handleResponse<Organization>(response)
    },

    async updateSettings(settings: Partial<OrganizationSettings>) {
      const response = await fetchWithRetry(`${API_BASE}/organizations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      return handleResponse<Organization>(response)
    },

    async getBranding() {
      const response = await fetchWithRetry(`${API_BASE}/organizations/branding`)
      return handleResponse<OrganizationBranding>(response)
    },

    async updateBranding(branding: OrganizationBranding) {
      const response = await fetchWithRetry(`${API_BASE}/organizations/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      })
      return handleResponse<OrganizationBranding>(response)
    },
  },

  // User-specific endpoints
  user: {
    async getOrganizations() {
      const response = await fetchWithRetry(`${API_BASE}/user/organizations`)
      return handleResponse<UserOrganizationItem[]>(response)
    },

    async createOrganization(name: string, timezone?: string) {
      const response = await fetchWithRetry(`${API_BASE}/user/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      })
      return handleResponse<Organization>(response)
    },

    async switchOrganization(organizationId: string) {
      const response = await fetchWithRetry(`${API_BASE}/user/switch-organization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      })
      return handleResponse<SwitchOrganizationResponse>(response)
    },
  },

  // Members
  members: {
    async list() {
      const response = await fetchWithRetry(`${API_BASE}/members`)
      return handleResponse<OrganizationMember[]>(response)
    },

    async update(memberId: string, updates: MemberUpdate) {
      const response = await fetchWithRetry(`${API_BASE}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...updates }),
      })
      return handleResponse<OrganizationMember>(response)
    },

    async remove(memberId: string) {
      const response = await fetchWithRetry(`${API_BASE}/members?memberId=${memberId}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // Invitations
  invitations: {
    async list() {
      const response = await fetchWithRetry(`${API_BASE}/invitations`)
      return handleResponse<SafeInvitation[]>(response)
    },

    async create(data: { email: string; role: string; department: string; workspaceId?: string }) {
      const response = await fetchWithRetry(`${API_BASE}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return handleResponse<Invitation>(response)
    },

    async createBulk(data: { emails: string[]; role: string; department: string }) {
      const response = await fetchWithRetry(`${API_BASE}/invitations/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return handleResponse<{ successful: SafeInvitation[]; failed: { email: string; error: string }[] }>(response)
    },

    // Simplified bulk create for onboarding (defaults to member role)
    async bulkCreate(emails: string[], role: string = "member", department: string = "General") {
      const response = await fetchWithRetry(`${API_BASE}/invitations/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, role, department }),
      })
      return handleResponse<{ successful: SafeInvitation[]; failed: { email: string; error: string }[] }>(response)
    },

    async cancel(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/invitations?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },

    async getByToken(token: string) {
      const response = await fetchWithRetry(`${API_BASE}/invitations/accept?token=${token}`)
      return handleResponse<{ email: string; organizationName: string; role: string; department: string; existingUser: boolean }>(response)
    },

    async accept(token: string, name?: string, password?: string) {
      const response = await fetchWithRetry(`${API_BASE}/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      })
      return handleResponse<AuthResponse>(response)
    },
  },

  // Rocks
  rocks: {
    async list(userId?: string, workspaceId?: string) {
      const params = new URLSearchParams()
      if (userId) params.set("userId", userId)
      if (workspaceId) params.set("workspaceId", workspaceId)
      const response = await fetchWithRetry(`${API_BASE}/rocks?${params}`)
      return handleResponse<Rock[]>(response)
    },

    async create(rock: RockCreateInput) {
      const response = await fetchWithRetry(`${API_BASE}/rocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rock),
      })
      return handleResponse<Rock>(response)
    },

    async update(id: string, updates: Partial<Rock>) {
      const response = await fetchWithRetry(`${API_BASE}/rocks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<Rock>(response)
    },

    async delete(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/rocks?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // Tasks
  tasks: {
    async list(userId?: string, status?: string, workspaceId?: string) {
      const params = new URLSearchParams()
      if (userId) params.set("userId", userId)
      if (status) params.set("status", status)
      if (workspaceId) params.set("workspaceId", workspaceId)
      const response = await fetchWithRetry(`${API_BASE}/tasks?${params}`)
      return handleResponse<AssignedTask[]>(response)
    },

    async create(task: TaskCreateInput) {
      const response = await fetchWithRetry(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
      return handleResponse<AssignedTask>(response)
    },

    async update(id: string, updates: Partial<AssignedTask>) {
      const response = await fetchWithRetry(`${API_BASE}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<AssignedTask>(response)
    },

    async delete(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/tasks?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // EOD Reports
  eodReports: {
    async list(params?: { userId?: string; date?: string; startDate?: string; endDate?: string; workspaceId?: string }) {
      const searchParams = new URLSearchParams()
      if (params?.userId) searchParams.set("userId", params.userId)
      if (params?.date) searchParams.set("date", params.date)
      if (params?.startDate) searchParams.set("startDate", params.startDate)
      if (params?.endDate) searchParams.set("endDate", params.endDate)
      if (params?.workspaceId) searchParams.set("workspaceId", params.workspaceId)
      const response = await fetchWithRetry(`${API_BASE}/eod-reports?${searchParams}`)
      return handleResponse<EODReport[]>(response)
    },

    async create(report: EODReportCreateInput) {
      const response = await fetchWithRetry(`${API_BASE}/eod-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      })
      return handleResponse<EODReport>(response)
    },

    async update(id: string, updates: Partial<EODReport>) {
      const response = await fetchWithRetry(`${API_BASE}/eod-reports`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<EODReport>(response)
    },

    async delete(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/eod-reports?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // Notifications
  notifications: {
    async list(unreadOnly: boolean = false) {
      const params = unreadOnly ? "?unread=true" : ""
      const response = await fetchWithRetry(`${API_BASE}/notifications${params}`)
      return handleResponse<Notification[]>(response)
    },

    async getUnreadCount() {
      const response = await fetchWithRetry(`${API_BASE}/notifications?count=true`)
      return handleResponse<{ count: number }>(response)
    },

    async markAsRead(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      return handleResponse<Notification>(response)
    },

    async markAllAsRead() {
      const response = await fetchWithRetry(`${API_BASE}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })
      return handleResponse<{ markedCount: number }>(response)
    },

    async delete(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/notifications?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // AI Insights
  ai: {
    async getInsights(days: number = 7) {
      const response = await fetchWithRetry(`${API_BASE}/ai/parse-eod?days=${days}`)
      return handleResponse<EODInsight[]>(response)
    },

    async getDigest(date?: string) {
      const params = date ? `?date=${date}` : ""
      const response = await fetchWithRetry(`${API_BASE}/ai/digest${params}`)
      return handleResponse<DailyDigest>(response)
    },

    async generateDigest(date?: string) {
      const response = await fetchWithRetry(`${API_BASE}/ai/digest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      return handleResponse<DailyDigest>(response)
    },
  },

  // Billing
  billing: {
    async getSubscription() {
      const response = await fetchWithRetry(`${API_BASE}/billing/subscription`)
      return handleResponse<{ subscription: SubscriptionInfo; organization: Organization }>(response)
    },

    async createCheckout(plan: string, billingCycle: "monthly" | "yearly" = "monthly") {
      const response = await fetchWithRetry(`${API_BASE}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      })
      return handleResponse<{ url: string }>(response)
    },

    async changePlan(plan: string, billingCycle: "monthly" | "yearly" = "monthly") {
      const response = await fetchWithRetry(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_plan", plan, billingCycle }),
      })
      return handleResponse<{ subscription: SubscriptionInfo }>(response)
    },

    async cancelSubscription() {
      const response = await fetchWithRetry(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      return handleResponse<{ subscription: SubscriptionInfo }>(response)
    },

    async resumeSubscription() {
      const response = await fetchWithRetry(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      })
      return handleResponse<{ subscription: SubscriptionInfo }>(response)
    },

    async openPortal() {
      const response = await fetchWithRetry(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portal" }),
      })
      return handleResponse<{ url: string }>(response)
    },
  },

  // Clients
  clients: {
    async list(workspaceId: string, status?: string) {
      const params = new URLSearchParams({ workspaceId })
      if (status) params.set("status", status)
      const response = await fetchWithRetry(`${API_BASE}/clients?${params}`)
      return handleResponse<Client[]>(response)
    },

    async create(data: { name: string; workspaceId: string; description?: string; contactName?: string; contactEmail?: string; contactPhone?: string; website?: string; industry?: string; status?: Client["status"]; notes?: string; tags?: string[] }) {
      const response = await fetchWithRetry(`${API_BASE}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return handleResponse<Client>(response)
    },

    async update(id: string, updates: Partial<Client>) {
      const response = await fetchWithRetry(`${API_BASE}/clients`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<Client>(response)
    },

    async delete(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/clients?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // Projects
  projects: {
    async list(workspaceId: string, filters?: { status?: string; clientId?: string; ownerId?: string }) {
      const params = new URLSearchParams({ workspaceId })
      if (filters?.status) params.set("status", filters.status)
      if (filters?.clientId) params.set("clientId", filters.clientId)
      if (filters?.ownerId) params.set("ownerId", filters.ownerId)
      const response = await fetchWithRetry(`${API_BASE}/projects?${params}`)
      return handleResponse<Project[]>(response)
    },

    async create(data: { name: string; workspaceId: string; clientId?: string | null; description?: string; status?: Project["status"]; priority?: Project["priority"]; startDate?: string | null; dueDate?: string | null; ownerId?: string | null; tags?: string[] }) {
      const response = await fetchWithRetry(`${API_BASE}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return handleResponse<Project>(response)
    },

    async update(id: string, updates: Partial<Project>) {
      const response = await fetchWithRetry(`${API_BASE}/projects`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<Project>(response)
    },

    async delete(id: string) {
      const response = await fetchWithRetry(`${API_BASE}/projects?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },

    // Project Members
    async getMembers(projectId: string) {
      const response = await fetchWithRetry(`${API_BASE}/projects/members?projectId=${projectId}`)
      return handleResponse<ProjectMember[]>(response)
    },

    async addMember(projectId: string, userId: string, role?: string) {
      const response = await fetchWithRetry(`${API_BASE}/projects/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userId, role }),
      })
      return handleResponse<ProjectMember>(response)
    },

    async updateMemberRole(projectId: string, userId: string, role: string) {
      const response = await fetchWithRetry(`${API_BASE}/projects/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userId, role }),
      })
      return handleResponse<ProjectMember>(response)
    },

    async removeMember(projectId: string, userId: string) {
      const response = await fetchWithRetry(`${API_BASE}/projects/members?projectId=${projectId}&userId=${userId}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },
}

export { ApiError }
export default api
