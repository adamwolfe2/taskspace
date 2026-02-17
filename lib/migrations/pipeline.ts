/**
 * ETL Pipeline for Import Process
 * Orchestrates: Extract → Transform → Load
 */

import { getImporter } from './importers'
import type {
  ImportProvider,
  NormalizedData,
  ImportConfig,
  ValidationResult,
  ImportError,
  ChunkProcessingResult,
  NormalizedTask,
  NormalizedProject,
  NormalizedWorkspace,
  UserMapping,
} from './types'

// ========================================
// Extract Stage
// ========================================

/**
 * Extract: Fetch and parse raw file data
 * Downloads file from Vercel Blob and parses based on provider
 */
export async function extract(
  fileUrl: string,
  provider: ImportProvider
): Promise<unknown> {
  try {
    // Fetch file from Vercel Blob
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type') || ''

    // Parse based on content type
    if (contentType.includes('application/json') || provider === 'trello') {
      return await response.json()
    } else if (contentType.includes('text/csv') || provider === 'asana' || provider === 'generic_csv') {
      const text = await response.text()
      return text
    } else {
      // Try JSON first, fallback to text
      const text = await response.text()
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    }
  } catch (error) {
    throw new Error(
      `Extract failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// ========================================
// Normalize Stage (Transform)
// ========================================

/**
 * Normalize: Convert provider format to common NormalizedData format
 */
export async function normalize(
  raw: unknown,
  provider: ImportProvider
): Promise<NormalizedData> {
  const importer = getImporter(provider)
  return await importer.normalize(raw)
}

// ========================================
// Validate Stage
// ========================================

/**
 * Validate: Check data structure and detect issues
 */
export async function validate(
  raw: unknown,
  provider: ImportProvider
): Promise<ValidationResult> {
  const importer = getImporter(provider)
  return await importer.validate(raw)
}

// ========================================
// Map Stage (Apply User Configurations)
// ========================================

/**
 * Map: Apply user mappings to normalized data
 * - Map source users to TaskSpace users
 * - Map source statuses to TaskSpace statuses
 * - Map source priorities to TaskSpace priorities
 * - Assign workspaces based on workspace mappings
 */
export function map(
  normalized: NormalizedData,
  config: ImportConfig
): NormalizedData {
  const mapped: NormalizedData = {
    workspaces: [...normalized.workspaces],
    users: [...normalized.users],
    projects: [...normalized.projects],
    tasks: [...normalized.tasks],
    tags: [...normalized.tags],
  }

  // 1. Apply workspace mappings
  if (config.workspaceStrategy === 'single' && config.targetWorkspaceId) {
    // Map all entities to single workspace
    mapped.workspaces = []
    mapped.projects = mapped.projects.map((p) => ({
      ...p,
      workspaceExternalId: config.targetWorkspaceId!,
    }))
    mapped.tasks = mapped.tasks.map((t) => ({
      ...t,
      workspaceExternalId: config.targetWorkspaceId!,
    }))
  } else if (config.workspaceStrategy === 'multi' && config.workspaceMappings) {
    // Apply custom workspace mappings
    const workspaceMap = new Map(
      config.workspaceMappings.map((m) => [m.sourceId, m])
    )

    mapped.workspaces = mapped.workspaces
      .map((ws) => {
        const mapping = workspaceMap.get(ws.externalId)
        if (!mapping) return null // Skip unmapped workspaces

        return {
          ...ws,
          name: mapping.newWorkspaceName || ws.name,
          type: mapping.workspaceType || ws.type,
        }
      })
      .filter((ws): ws is NormalizedWorkspace => ws !== null)
  }

  // 2. Apply user mappings
  const userMap = new Map<string, string>()
  config.userMappings.forEach((mapping) => {
    const sourceUser = normalized.users.find(
      (u) => u.email === mapping.sourceEmail || u.name === mapping.sourceName
    )
    if (sourceUser && mapping.targetUserId && mapping.action === 'map') {
      userMap.set(sourceUser.externalId, mapping.targetUserId)
    }
  })

  // Update task assignees with mapped user IDs
  mapped.tasks = mapped.tasks.map((task) => ({
    ...task,
    assigneeExternalIds: task.assigneeExternalIds
      .map((externalId) => userMap.get(externalId))
      .filter((id): id is string => !!id),
  }))

  // 3. Apply status mappings
  if (config.statusMappings) {
    mapped.tasks = mapped.tasks.map((task) => ({
      ...task,
      status: config.statusMappings[task.status] || task.status,
    }))
  }

  // 4. Apply priority mappings
  if (config.priorityMappings) {
    mapped.tasks = mapped.tasks.map((task) => ({
      ...task,
      priority: task.priority
        ? config.priorityMappings[task.priority] || task.priority
        : config.defaultPriority,
    }))
  }

  // 5. Filter out tags if not importing
  if (!config.importTags) {
    mapped.tags = []
    mapped.tasks = mapped.tasks.map((task) => ({
      ...task,
      tags: [],
    }))
  }

  return mapped
}

// ========================================
// Load Stage (Create Entities)
// ========================================

/**
 * Load: Create TaskSpace entities from mapped data
 * Processes in chunks to avoid timeouts
 *
 * NOTE: This function is meant to be called from API routes
 * with proper database access and authorization
 */
export async function load(
  mapped: NormalizedData,
  importJobId: string,
  organizationId: string,
  offset: number,
  limit: number,
  db: any, // Database interface (will be typed properly in db layer)
  logger: (level: string, stage: string, message: string, metadata?: any) => Promise<void>
): Promise<ChunkProcessingResult> {
  const errors: ImportError[] = []
  let succeeded = 0
  let failed = 0

  // Get slice of tasks to process in this chunk
  const tasksChunk = mapped.tasks.slice(offset, offset + limit)

  await logger('info', 'task_import', `Processing chunk: ${offset} to ${offset + tasksChunk.length}`)

  for (const task of tasksChunk) {
    try {
      // 1. Check if already imported (idempotency)
      const existing = await db.migrations.findExternalIdMap({
        organizationId,
        provider: 'trello', // TODO: Get from import job
        externalId: task.externalId,
        entityType: 'task',
      })

      if (existing) {
        await logger('debug', 'task_import', `Skipping duplicate task: ${task.title}`, {
          externalId: task.externalId,
          internalId: existing.internalId,
        })
        succeeded++
        continue
      }

      // 2. Resolve workspace ID
      let workspaceId: string
      if (mapped.workspaces.length === 0) {
        // Single workspace import
        workspaceId = task.workspaceExternalId // Already mapped to internal ID
      } else {
        // Multi-workspace import - lookup from external_id_map
        const wsMapping = await db.migrations.findExternalIdMap({
          organizationId,
          provider: 'trello', // TODO: Get from import job
          externalId: task.workspaceExternalId,
          entityType: 'workspace',
        })
        workspaceId = wsMapping?.internalId || task.workspaceExternalId
      }

      // 3. Resolve project ID (if task has project)
      let projectId: string | null = null
      if (task.projectExternalId) {
        const projectMapping = await db.migrations.findExternalIdMap({
          organizationId,
          provider: 'trello',
          externalId: task.projectExternalId,
          entityType: 'project',
        })
        projectId = projectMapping?.internalId || null
      }

      // 4. Create task
      const createdTask = await db.tasks.create({
        workspaceId,
        projectId,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        assigneeIds: task.assigneeExternalIds, // Already mapped to internal IDs
        tags: task.tags,
        metadata: task.metadata,
      })

      // 5. Create external ID mapping
      await db.migrations.createExternalIdMap({
        organizationId,
        importJobId,
        provider: 'trello',
        externalId: task.externalId,
        entityType: 'task',
        internalId: createdTask.id,
      })

      await logger('info', 'task_import', `Created task: ${task.title}`, {
        taskId: createdTask.id,
        externalId: task.externalId,
      })

      succeeded++
    } catch (error) {
      failed++
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      errors.push({
        code: 'TASK_CREATION_FAILED',
        message: `Failed to create task "${task.title}": ${errorMsg}`,
        context: { task, error: errorMsg },
      })

      await logger('error', 'task_import', `Failed to create task: ${task.title}`, {
        error: errorMsg,
        task,
      })
    }
  }

  const hasMore = offset + limit < mapped.tasks.length

  return {
    processed: tasksChunk.length,
    succeeded,
    failed,
    hasMore,
    nextOffset: offset + limit,
    errors,
  }
}

// ========================================
// Utility Functions
// ========================================

/**
 * Calculate estimated duration based on item count
 * Rule of thumb: ~100ms per task
 */
export function estimateDuration(itemCount: number): number {
  return Math.ceil((itemCount * 100) / 1000) // seconds
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(processed: number, total: number): number {
  if (total === 0) return 100
  return Math.min(100, Math.round((processed / total) * 100))
}
