/**
 * Asana Integration Client
 * Handles two-way sync between AIMS EOD Tracker and Asana
 * Includes webhook signature verification for incoming requests
 */

import { createHmac, timingSafeEqual } from "crypto"

// ============================================
// ASANA WEBHOOK SIGNATURE VERIFICATION
// ============================================

/**
 * Verify Asana webhook signature (X-Hook-Signature)
 *
 * Asana uses HMAC-SHA256 signature verification:
 * https://developers.asana.com/docs/webhooks#security
 *
 * @param signature - X-Hook-Signature header value
 * @param body - Raw request body string
 * @param secret - Webhook secret from Asana
 * @returns true if signature is valid
 */
export function verifyAsanaSignature(
  signature: string,
  body: string,
  secret: string
): boolean {
  if (!signature || !body || !secret) {
    return false
  }

  // Compute expected signature
  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("hex")

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    )
  } catch {
    // Buffer lengths don't match
    return false
  }
}

/**
 * Handle Asana webhook handshake
 *
 * When Asana first establishes a webhook, it sends a POST with
 * X-Hook-Secret header. We must respond with the same header.
 *
 * @param request - Incoming request
 * @returns Response for handshake, or null if not a handshake
 */
export function handleAsanaWebhookHandshake(
  request: Request
): Response | null {
  const hookSecret = request.headers.get("x-hook-secret")

  if (hookSecret) {
    // This is a webhook handshake request
    // Store this secret for future verification
    return new Response(null, {
      status: 200,
      headers: {
        "X-Hook-Secret": hookSecret,
      },
    })
  }

  return null
}

/**
 * Validate incoming Asana webhook request
 *
 * @param request - Incoming request
 * @returns Validation result with extracted data
 */
export async function validateAsanaRequest(
  request: Request
): Promise<{
  valid: boolean
  error?: string
  body?: string
  isHandshake?: boolean
}> {
  // Check for handshake first
  const hookSecret = request.headers.get("x-hook-secret")
  if (hookSecret) {
    return { valid: true, isHandshake: true }
  }

  // Get stored secret
  const webhookSecret = process.env.ASANA_WEBHOOK_SECRET
  if (!webhookSecret) {
    return { valid: false, error: "ASANA_WEBHOOK_SECRET not configured" }
  }

  const signature = request.headers.get("x-hook-signature")
  if (!signature) {
    return { valid: false, error: "Missing x-hook-signature header" }
  }

  const body = await request.text()

  if (!verifyAsanaSignature(signature, body, webhookSecret)) {
    return { valid: false, error: "Invalid signature" }
  }

  return { valid: true, body }
}

const ASANA_API_BASE = "https://app.asana.com/api/1.0"

export interface AsanaUser {
  gid: string
  name: string
  email: string
}

export interface AsanaProject {
  gid: string
  name: string
  workspace: {
    gid: string
    name: string
  }
}

export interface AsanaTask {
  gid: string
  name: string
  notes: string
  completed: boolean
  completed_at: string | null
  due_on: string | null
  assignee: AsanaUser | null
  projects: { gid: string; name: string }[]
  custom_fields?: any[]
}

export interface AsanaSection {
  gid: string
  name: string
  project: { gid: string }
}

export interface CreateAsanaTaskInput {
  name: string
  notes?: string
  projects?: string[]
  assignee?: string
  due_on?: string
  completed?: boolean
}

export interface UpdateAsanaTaskInput {
  name?: string
  notes?: string
  completed?: boolean
  due_on?: string
  assignee?: string
}

class AsanaClient {
  private accessToken: string | null = null

  constructor() {
    this.accessToken = process.env.ASANA_ACCESS_TOKEN || null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Asana access token not configured")
    }

    const url = `${ASANA_API_BASE}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        `Asana API error: ${response.status} - ${error.errors?.[0]?.message || response.statusText}`
      )
    }

    const data = await response.json()
    return data.data as T
  }

  /**
   * Check if Asana is configured
   */
  isConfigured(): boolean {
    return !!this.accessToken
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<AsanaUser> {
    return this.request<AsanaUser>("/users/me")
  }

  /**
   * Get all workspaces the user has access to
   */
  async getWorkspaces(): Promise<{ gid: string; name: string }[]> {
    return this.request("/workspaces")
  }

  /**
   * Get all projects in a workspace
   */
  async getProjects(workspaceGid: string): Promise<AsanaProject[]> {
    return this.request(`/workspaces/${workspaceGid}/projects?opt_fields=name,workspace.name`)
  }

  /**
   * Get a specific project
   */
  async getProject(projectGid: string): Promise<AsanaProject> {
    return this.request(`/projects/${projectGid}?opt_fields=name,workspace.name,workspace.gid`)
  }

  /**
   * Get sections in a project
   */
  async getProjectSections(projectGid: string): Promise<AsanaSection[]> {
    return this.request(`/projects/${projectGid}/sections`)
  }

  /**
   * Get all users in a workspace
   */
  async getWorkspaceUsers(workspaceGid: string): Promise<AsanaUser[]> {
    return this.request(`/workspaces/${workspaceGid}/users?opt_fields=name,email`)
  }

  /**
   * Helper to get a date string N days ago in YYYY-MM-DD format
   */
  private getDateDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString().split('T')[0]
  }

  /**
   * Get tasks from a project
   * @param options.includeCompleted - if true, fetches both completed and incomplete tasks
   * @param options.completedSinceDays - days to look back for completed tasks (default: 365)
   */
  async getProjectTasks(
    projectGid: string,
    options?: { completed?: boolean; assignee?: string; includeCompleted?: boolean; completedSinceDays?: number }
  ): Promise<AsanaTask[]> {
    const optFields = "name,notes,completed,completed_at,due_on,assignee.name,assignee.email,assignee.gid,projects.name"

    // If we want all tasks (including completed), we need to fetch separately and merge
    if (options?.includeCompleted) {
      // Get incomplete tasks
      let incompleteEndpoint = `/projects/${projectGid}/tasks?opt_fields=${optFields}`
      if (options?.assignee) {
        incompleteEndpoint += `&assignee=${options.assignee}`
      }
      const incompleteTasks = await this.request<AsanaTask[]>(incompleteEndpoint)

      // Get completed tasks (default to last 365 days if not specified)
      const completedSince = this.getDateDaysAgo(options.completedSinceDays || 365)
      let completedEndpoint = `/projects/${projectGid}/tasks?opt_fields=${optFields}&completed_since=${completedSince}`
      if (options?.assignee) {
        completedEndpoint += `&assignee=${options.assignee}`
      }
      const completedTasks = await this.request<AsanaTask[]>(completedEndpoint)

      // Merge and deduplicate by gid
      const taskMap = new Map<string, AsanaTask>()
      for (const task of [...incompleteTasks, ...completedTasks]) {
        taskMap.set(task.gid, task)
      }
      return Array.from(taskMap.values())
    }

    // Original behavior for backward compatibility
    let endpoint = `/projects/${projectGid}/tasks?opt_fields=${optFields}`

    if (options?.completed !== undefined) {
      endpoint += `&completed_since=${options.completed ? "now" : "1970-01-01"}`
    }
    if (options?.assignee) {
      endpoint += `&assignee=${options.assignee}`
    }

    return this.request(endpoint)
  }

  /**
   * Get a specific task
   */
  async getTask(taskGid: string): Promise<AsanaTask> {
    return this.request(
      `/tasks/${taskGid}?opt_fields=name,notes,completed,completed_at,due_on,assignee.name,assignee.email,assignee.gid,projects.name`
    )
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateAsanaTaskInput): Promise<AsanaTask> {
    return this.request("/tasks", {
      method: "POST",
      body: JSON.stringify({ data: input }),
    })
  }

  /**
   * Update an existing task
   */
  async updateTask(taskGid: string, input: UpdateAsanaTaskInput): Promise<AsanaTask> {
    return this.request(`/tasks/${taskGid}`, {
      method: "PUT",
      body: JSON.stringify({ data: input }),
    })
  }

  /**
   * Mark a task as complete
   */
  async completeTask(taskGid: string): Promise<AsanaTask> {
    return this.updateTask(taskGid, { completed: true })
  }

  /**
   * Mark a task as incomplete
   */
  async uncompleteTask(taskGid: string): Promise<AsanaTask> {
    return this.updateTask(taskGid, { completed: false })
  }

  /**
   * Delete a task
   */
  async deleteTask(taskGid: string): Promise<void> {
    await this.request(`/tasks/${taskGid}`, {
      method: "DELETE",
    })
  }

  /**
   * Search for tasks by name or assignee
   */
  async searchTasks(
    workspaceGid: string,
    query: { text?: string; assignee?: string; projectGid?: string }
  ): Promise<AsanaTask[]> {
    let endpoint = `/workspaces/${workspaceGid}/tasks/search?opt_fields=name,notes,completed,completed_at,due_on,assignee.name,assignee.email,projects.name`

    if (query.text) {
      endpoint += `&text=${encodeURIComponent(query.text)}`
    }
    if (query.assignee) {
      endpoint += `&assignee.any=${query.assignee}`
    }
    if (query.projectGid) {
      endpoint += `&projects.any=${query.projectGid}`
    }

    return this.request(endpoint)
  }

  /**
   * Add a task to a project
   */
  async addTaskToProject(taskGid: string, projectGid: string): Promise<void> {
    await this.request(`/tasks/${taskGid}/addProject`, {
      method: "POST",
      body: JSON.stringify({ data: { project: projectGid } }),
    })
  }

  /**
   * Get tasks assigned to a specific user in a project
   */
  async getUserTasksInProject(
    projectGid: string,
    userGid: string
  ): Promise<AsanaTask[]> {
    return this.request(
      `/tasks?project=${projectGid}&assignee=${userGid}&opt_fields=name,notes,completed,completed_at,due_on,assignee.name,assignee.email,projects.name`
    )
  }
}

// Export singleton instance
export const asanaClient = new AsanaClient()

// Export types and functions for sync operations
export interface AsanaUserMapping {
  aimsUserId: string
  aimsUserEmail: string
  aimsUserName: string
  asanaUserId: string
  asanaUserEmail: string
  asanaUserName: string
}

export interface AsanaTaskMapping {
  aimsTaskId: string
  asanaTaskGid: string
  lastSyncedAt: string
  syncDirection: "aims_to_asana" | "asana_to_aims" | "bidirectional"
}

export interface AsanaSyncConfig {
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

/**
 * Default sync configuration
 */
export const defaultAsanaSyncConfig: AsanaSyncConfig = {
  enabled: false,
  projectGid: "",
  projectName: "",
  workspaceGid: "",
  workspaceName: "",
  userMappings: [],
  syncTasks: true,
  syncRocks: true,
  lastSyncAt: null,
}
