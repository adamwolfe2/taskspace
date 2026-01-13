import type { ApiResponse } from "@/lib/types"

const API_BASE = "/api"

class ApiError extends Error {
  status: number
  data?: unknown  // Include any data from the error response (e.g., existing report for 409)

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data: ApiResponse<T> = await response.json()

  if (!response.ok || !data.success) {
    // Include any data in the error (useful for 409 conflicts that return existing record)
    throw new ApiError(data.error || "An error occurred", response.status, data.data)
  }

  return data.data as T
}

export const api = {
  // Auth
  auth: {
    async login(email: string, password: string, organizationId?: string) {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, organizationId }),
      })
      return handleResponse<any>(response)
    },

    async register(email: string, password: string, name: string, organizationName?: string) {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, organizationName }),
      })
      return handleResponse<any>(response)
    },

    async logout() {
      const response = await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
      })
      return handleResponse<null>(response)
    },

    async getSession() {
      const response = await fetch(`${API_BASE}/auth/session`)
      return handleResponse<any>(response)
    },
  },

  // Organizations
  organizations: {
    async list() {
      const response = await fetch(`${API_BASE}/organizations`)
      return handleResponse<any[]>(response)
    },

    async create(name: string, timezone?: string) {
      const response = await fetch(`${API_BASE}/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      })
      return handleResponse<any>(response)
    },

    async update(settings: any) {
      const response = await fetch(`${API_BASE}/organizations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      return handleResponse<any>(response)
    },

    async updateSettings(settings: any) {
      const response = await fetch(`${API_BASE}/organizations`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      return handleResponse<any>(response)
    },

    async getBranding() {
      const response = await fetch(`${API_BASE}/organizations/branding`)
      return handleResponse<any>(response)
    },

    async updateBranding(branding: {
      logoUrl?: string
      primaryColor?: string
      secondaryColor?: string
      accentColor?: string
      faviconUrl?: string
      customDomain?: string
    }) {
      const response = await fetch(`${API_BASE}/organizations/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      })
      return handleResponse<any>(response)
    },
  },

  // User-specific endpoints
  user: {
    async getOrganizations() {
      const response = await fetch(`${API_BASE}/user/organizations`)
      return handleResponse<any[]>(response)
    },

    async createOrganization(name: string, timezone?: string) {
      const response = await fetch(`${API_BASE}/user/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, timezone }),
      })
      return handleResponse<any>(response)
    },

    async switchOrganization(organizationId: string) {
      const response = await fetch(`${API_BASE}/user/switch-organization`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      })
      return handleResponse<any>(response)
    },
  },

  // Members
  members: {
    async list() {
      const response = await fetch(`${API_BASE}/members`)
      return handleResponse<any[]>(response)
    },

    async update(memberId: string, updates: any) {
      const response = await fetch(`${API_BASE}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...updates }),
      })
      return handleResponse<any>(response)
    },

    async remove(memberId: string) {
      const response = await fetch(`${API_BASE}/members?memberId=${memberId}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // Invitations
  invitations: {
    async list() {
      const response = await fetch(`${API_BASE}/invitations`)
      return handleResponse<any[]>(response)
    },

    async create(data: { email: string; role: string; department: string }) {
      const response = await fetch(`${API_BASE}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return handleResponse<any>(response)
    },

    async createBulk(data: { emails: string[]; role: string; department: string }) {
      const response = await fetch(`${API_BASE}/invitations/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      return handleResponse<any>(response)
    },

    // Simplified bulk create for onboarding (defaults to member role)
    async bulkCreate(emails: string[], role: string = "member", department: string = "General") {
      const response = await fetch(`${API_BASE}/invitations/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, role, department }),
      })
      return handleResponse<any>(response)
    },

    async cancel(id: string) {
      const response = await fetch(`${API_BASE}/invitations?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },

    async getByToken(token: string) {
      const response = await fetch(`${API_BASE}/invitations/accept?token=${token}`)
      return handleResponse<any>(response)
    },

    async accept(token: string, name?: string, password?: string) {
      const response = await fetch(`${API_BASE}/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      })
      return handleResponse<any>(response)
    },
  },

  // Rocks
  rocks: {
    async list(userId?: string) {
      const params = new URLSearchParams()
      if (userId) params.set("userId", userId)
      const response = await fetch(`${API_BASE}/rocks?${params}`)
      return handleResponse<any[]>(response)
    },

    async create(rock: any) {
      const response = await fetch(`${API_BASE}/rocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rock),
      })
      return handleResponse<any>(response)
    },

    async update(id: string, updates: any) {
      const response = await fetch(`${API_BASE}/rocks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<any>(response)
    },

    async delete(id: string) {
      const response = await fetch(`${API_BASE}/rocks?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // Tasks
  tasks: {
    async list(userId?: string, status?: string) {
      const params = new URLSearchParams()
      if (userId) params.set("userId", userId)
      if (status) params.set("status", status)
      const response = await fetch(`${API_BASE}/tasks?${params}`)
      return handleResponse<any[]>(response)
    },

    async create(task: any) {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task),
      })
      return handleResponse<any>(response)
    },

    async update(id: string, updates: any) {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<any>(response)
    },

    async delete(id: string) {
      const response = await fetch(`${API_BASE}/tasks?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // EOD Reports
  eodReports: {
    async list(params?: { userId?: string; date?: string; startDate?: string; endDate?: string }) {
      const searchParams = new URLSearchParams()
      if (params?.userId) searchParams.set("userId", params.userId)
      if (params?.date) searchParams.set("date", params.date)
      if (params?.startDate) searchParams.set("startDate", params.startDate)
      if (params?.endDate) searchParams.set("endDate", params.endDate)
      const response = await fetch(`${API_BASE}/eod-reports?${searchParams}`)
      return handleResponse<any[]>(response)
    },

    async create(report: any) {
      const response = await fetch(`${API_BASE}/eod-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      })
      return handleResponse<any>(response)
    },

    async update(id: string, updates: any) {
      const response = await fetch(`${API_BASE}/eod-reports`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })
      return handleResponse<any>(response)
    },

    async delete(id: string) {
      const response = await fetch(`${API_BASE}/eod-reports?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // Notifications
  notifications: {
    async list(unreadOnly: boolean = false) {
      const params = unreadOnly ? "?unread=true" : ""
      const response = await fetch(`${API_BASE}/notifications${params}`)
      return handleResponse<any[]>(response)
    },

    async getUnreadCount() {
      const response = await fetch(`${API_BASE}/notifications?count=true`)
      return handleResponse<{ count: number }>(response)
    },

    async markAsRead(id: string) {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      return handleResponse<any>(response)
    },

    async markAllAsRead() {
      const response = await fetch(`${API_BASE}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      })
      return handleResponse<{ markedCount: number }>(response)
    },

    async delete(id: string) {
      const response = await fetch(`${API_BASE}/notifications?id=${id}`, {
        method: "DELETE",
      })
      return handleResponse<null>(response)
    },
  },

  // AI Insights
  ai: {
    async getInsights(days: number = 7) {
      const response = await fetch(`${API_BASE}/ai/parse-eod?days=${days}`)
      return handleResponse<any[]>(response)
    },

    async getDigest(date?: string) {
      const params = date ? `?date=${date}` : ""
      const response = await fetch(`${API_BASE}/ai/digest${params}`)
      return handleResponse<any>(response)
    },

    async generateDigest(date?: string) {
      const response = await fetch(`${API_BASE}/ai/digest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      return handleResponse<any>(response)
    },
  },

  // Billing
  billing: {
    async getSubscription() {
      const response = await fetch(`${API_BASE}/billing/subscription`)
      return handleResponse<any>(response)
    },

    async createCheckout(plan: string, billingCycle: "monthly" | "yearly" = "monthly") {
      const response = await fetch(`${API_BASE}/billing/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingCycle }),
      })
      return handleResponse<{ url: string }>(response)
    },

    async changePlan(plan: string, billingCycle: "monthly" | "yearly" = "monthly") {
      const response = await fetch(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_plan", plan, billingCycle }),
      })
      return handleResponse<any>(response)
    },

    async cancelSubscription() {
      const response = await fetch(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      })
      return handleResponse<any>(response)
    },

    async resumeSubscription() {
      const response = await fetch(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      })
      return handleResponse<any>(response)
    },

    async openPortal() {
      const response = await fetch(`${API_BASE}/billing/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "portal" }),
      })
      return handleResponse<{ url: string }>(response)
    },
  },
}

export { ApiError }
export default api
