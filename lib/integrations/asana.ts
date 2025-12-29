/**
 * Asana Integration Client
 * Handles two-way sync between AIMS EOD Tracker and Asana
 */

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
   * Get tasks from a project
   */
  async getProjectTasks(
    projectGid: string,
    options?: { completed?: boolean; assignee?: string }
  ): Promise<AsanaTask[]> {
    let endpoint = `/projects/${projectGid}/tasks?opt_fields=name,notes,completed,completed_at,due_on,assignee.name,assignee.email,assignee.gid,projects.name`

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
