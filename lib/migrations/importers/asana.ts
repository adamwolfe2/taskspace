/**
 * Asana Importer
 * Parses Asana JSON export files
 * Export format: { data: { projects: [...], tasks: [...], users: [...] } }
 */

import { BaseImporter } from './base'
import type {
  ImportProvider,
  NormalizedData,
  ValidationResult,
  NormalizedWorkspace,
  NormalizedUser,
  NormalizedProject,
  NormalizedTask,
  ImportError,
  ImportWarning,
} from '../types'

// ========================================
// Asana JSON Format Types
// ========================================

interface AsanaExport {
  data: {
    projects?: AsanaProject[]
    tasks?: AsanaTask[]
    users?: AsanaUser[]
    sections?: AsanaSection[]
    tags?: AsanaTag[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

interface AsanaProject {
  gid: string
  name: string
  notes?: string
  color?: string
  archived?: boolean
  sections?: AsanaSection[]
  [key: string]: unknown
}

interface AsanaSection {
  gid: string
  name: string
  project?: { gid: string }
  [key: string]: unknown
}

interface AsanaTask {
  gid: string
  name: string
  notes?: string
  completed: boolean
  completed_at?: string | null
  due_on?: string | null
  due_at?: string | null
  assignee?: { gid: string; name?: string; email?: string } | null
  projects?: Array<{ gid: string; name?: string }>
  memberships?: Array<{ project: { gid: string }; section?: { gid: string; name?: string } }>
  tags?: Array<{ gid: string; name: string }>
  parent?: { gid: string } | null
  subtasks?: AsanaTask[]
  [key: string]: unknown
}

interface AsanaUser {
  gid: string
  name: string
  email?: string
  photo?: { image_60x60?: string } | null
  [key: string]: unknown
}

interface AsanaTag {
  gid: string
  name: string
  color?: string
  [key: string]: unknown
}

// ========================================
// Asana Importer Implementation
// ========================================

export class AsanaImporter extends BaseImporter {
  readonly provider: ImportProvider = 'asana'
  readonly supportedFormats = ['.json']

  detect(file: File | Buffer, fileName: string): boolean {
    if (!fileName.toLowerCase().endsWith('.json')) {
      return false
    }

    if (Buffer.isBuffer(file)) {
      try {
        const data = JSON.parse(file.toString('utf-8'))
        return this.isAsanaExport(data)
      } catch {
        return false
      }
    }

    return false // Can't detect without content
  }

  async validate(raw: unknown): Promise<ValidationResult> {
    const errors: ImportError[] = []
    const warnings: ImportWarning[] = []

    if (typeof raw !== 'object' || raw === null) {
      errors.push(this.createError('INVALID_FORMAT', 'File must be a valid JSON object'))
      return { valid: false, errors, warnings }
    }

    const data = raw as Record<string, unknown>

    // Check for Asana data structure
    if (!data.data || typeof data.data !== 'object') {
      errors.push(this.createError('INVALID_FORMAT', 'Missing "data" object — not a valid Asana export'))
      return { valid: false, errors, warnings }
    }

    const asanaData = data.data as Record<string, unknown>

    // Must have tasks
    if (!Array.isArray(asanaData.tasks) || asanaData.tasks.length === 0) {
      errors.push(this.createError('NO_TASKS', 'No tasks found in Asana export'))
      return { valid: false, errors, warnings }
    }

    // Validate task structure
    const tasks = asanaData.tasks as AsanaTask[]
    const invalidTasks = tasks.filter(t => !t.gid || !t.name)
    if (invalidTasks.length > 0) {
      warnings.push(
        this.createWarning(
          'INVALID_TASKS',
          `${invalidTasks.length} task(s) missing gid or name — they will be skipped`,
          { count: invalidTasks.length }
        )
      )
    }

    if (!Array.isArray(asanaData.users) || asanaData.users.length === 0) {
      warnings.push(this.createWarning('NO_USERS', 'No users found in Asana export'))
    }

    if (!Array.isArray(asanaData.projects) || asanaData.projects.length === 0) {
      warnings.push(this.createWarning('NO_PROJECTS', 'No projects found in Asana export'))
    }

    const activeTasks = tasks.filter(t => t.gid && t.name)

    return {
      valid: true,
      errors: [],
      warnings,
      metadata: {
        detectedProvider: 'asana',
        estimatedItems: activeTasks.length,
        fileFormat: 'asana_json',
      },
    }
  }

  async normalize(raw: unknown): Promise<NormalizedData> {
    const exported = raw as AsanaExport
    const data = exported.data

    const projects = data.projects || []
    const tasks = data.tasks || []
    const users = data.users || []
    const topLevelTags = data.tags || []

    // Filter out archived projects
    const activeProjects = projects.filter(p => !p.archived)

    // Create workspace — use first project name or "Asana Import"
    const workspaceName = activeProjects.length > 0
      ? activeProjects[0].name
      : 'Asana Import'

    const workspace: NormalizedWorkspace = {
      externalId: 'asana_import',
      name: workspaceName,
      type: 'Project',
      metadata: { source: 'asana' },
    }

    // Normalize users
    const normalizedUsers: NormalizedUser[] = users.map(user => ({
      externalId: user.gid,
      email: user.email || null,
      name: user.name,
      avatarUrl: user.photo?.image_60x60,
      metadata: { asanaGid: user.gid },
    }))

    // Normalize projects
    const normalizedProjects: NormalizedProject[] = activeProjects.map(project => ({
      externalId: project.gid,
      workspaceExternalId: workspace.externalId,
      name: project.name,
      description: project.notes,
      color: project.color,
      metadata: { asanaGid: project.gid },
    }))

    // Build section → status mapping
    const sectionStatusMap = new Map<string, string>()
    const allSections = [
      ...(data.sections || []),
      ...activeProjects.flatMap(p => p.sections || []),
    ]
    for (const section of allSections) {
      sectionStatusMap.set(section.gid, this.mapAsanaStatus(section.name))
    }

    // Collect tags
    const tagSet = new Set<string>()
    const tagLookup = new Map<string, string>()
    for (const tag of topLevelTags) {
      const normalized = this.normalizeTagName(tag.name)
      if (normalized) {
        tagSet.add(normalized)
        tagLookup.set(tag.gid, normalized)
      }
    }

    // Normalize tasks (filter out subtasks — they're included via parent)
    const validTasks = tasks.filter(t => t.gid && t.name && !t.parent)
    const normalizedTasks: NormalizedTask[] = []

    for (let i = 0; i < validTasks.length; i++) {
      const task = validTasks[i]
      normalizedTasks.push(this.normalizeTask(task, workspace.externalId, sectionStatusMap, tagLookup, tagSet, i))

      // Include subtasks as separate tasks
      if (task.subtasks) {
        for (let j = 0; j < task.subtasks.length; j++) {
          const subtask = task.subtasks[j]
          if (subtask.gid && subtask.name) {
            normalizedTasks.push(
              this.normalizeTask(subtask, workspace.externalId, sectionStatusMap, tagLookup, tagSet, normalizedTasks.length)
            )
          }
        }
      }
    }

    return {
      workspaces: [workspace],
      users: normalizedUsers,
      projects: normalizedProjects,
      tasks: normalizedTasks,
      tags: Array.from(tagSet),
    }
  }

  // ========================================
  // Private Helpers
  // ========================================

  private isAsanaExport(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false
    const obj = data as Record<string, unknown>
    if (!obj.data || typeof obj.data !== 'object') return false
    const inner = obj.data as Record<string, unknown>
    return Array.isArray(inner.tasks)
  }

  private normalizeTask(
    task: AsanaTask,
    workspaceExternalId: string,
    sectionStatusMap: Map<string, string>,
    tagLookup: Map<string, string>,
    tagSet: Set<string>,
    position: number
  ): NormalizedTask {
    // Determine project
    const projectGid = task.projects?.[0]?.gid
      || task.memberships?.[0]?.project?.gid

    // Determine status from section or completion
    let status = 'not-started'
    if (task.completed) {
      status = 'completed'
    } else {
      const sectionGid = task.memberships?.[0]?.section?.gid
      const sectionName = task.memberships?.[0]?.section?.name
      if (sectionGid && sectionStatusMap.has(sectionGid)) {
        status = sectionStatusMap.get(sectionGid)!
      } else if (sectionName) {
        status = this.mapAsanaStatus(sectionName)
      }
    }

    // Tags
    const taskTags: string[] = []
    if (task.tags) {
      for (const tag of task.tags) {
        const normalized = tagLookup.get(tag.gid) || this.normalizeTagName(tag.name)
        if (normalized) {
          tagSet.add(normalized)
          taskTags.push(normalized)
        }
      }
    }

    // Assignee
    const assigneeExternalIds: string[] = []
    if (task.assignee?.gid) {
      assigneeExternalIds.push(task.assignee.gid)
    }

    return {
      externalId: task.gid,
      projectExternalId: projectGid,
      workspaceExternalId,
      title: task.name,
      description: this.sanitizeHtml(task.notes),
      status,
      assigneeExternalIds,
      dueDate: this.parseDate(task.due_on || task.due_at),
      tags: taskTags,
      position,
      metadata: {
        asanaGid: task.gid,
        completed: task.completed,
        completedAt: task.completed_at,
        parentGid: task.parent?.gid,
      },
    }
  }

  private mapAsanaStatus(sectionName: string): string {
    const normalized = sectionName.toLowerCase().trim()

    if (
      normalized.includes('done') ||
      normalized.includes('complete') ||
      normalized.includes('finished') ||
      normalized.includes('closed')
    ) {
      return 'completed'
    }

    if (
      normalized.includes('progress') ||
      normalized.includes('doing') ||
      normalized.includes('working') ||
      normalized.includes('active') ||
      normalized.includes('current')
    ) {
      return 'in-progress'
    }

    if (
      normalized.includes('blocked') ||
      normalized.includes('waiting') ||
      normalized.includes('hold') ||
      normalized.includes('stuck')
    ) {
      return 'blocked'
    }

    if (
      normalized.includes('backlog') ||
      normalized.includes('later') ||
      normalized.includes('future') ||
      normalized.includes('upcoming')
    ) {
      return 'not-started'
    }

    return 'not-started'
  }
}
