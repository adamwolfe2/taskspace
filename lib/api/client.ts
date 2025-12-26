import type { ApiResponse } from "@/lib/types"

const API_BASE = "/api"

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data: ApiResponse<T> = await response.json()

  if (!response.ok || !data.success) {
    throw new ApiError(data.error || "An error occurred", response.status)
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
}

export { ApiError }
export default api
