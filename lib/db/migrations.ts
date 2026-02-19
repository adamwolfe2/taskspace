/**
 * Database Access Layer for Migration Center
 * CRUD operations for import_jobs, external_id_map, import_conflicts, import_logs
 */

import crypto from 'crypto'
import { sql } from './sql'
import type {
  ImportJob,
  ImportConfig,
  ImportStats,
  ImportError,
  ImportWarning,
  ImportStatus,
  ImportProvider,
  ExternalIdMap,
  ImportConflict,
  ImportLog,
  ConflictResolution,
  LogLevel,
  ImportStage,
  SourceMetadata,
} from '../migrations/types'

// ========================================
// Parser Functions
// ========================================

function parseImportJob(row: Record<string, unknown>): ImportJob {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    workspaceId: (row.workspace_id as string | null) || null,
    createdBy: row.created_by as string,
    provider: row.provider as ImportProvider,
    status: row.status as ImportStatus,
    progress: row.progress as number,
    fileUrl: row.file_url as string,
    fileName: row.file_name as string,
    fileSize: row.file_size as number,
    config: row.config as ImportConfig,
    stats: row.stats as ImportStats,
    errors: (row.errors as ImportError[]) || [],
    warnings: (row.warnings as ImportWarning[]) || [],
    startedAt: (row.started_at as Date)?.toISOString() || '',
    completedAt: row.completed_at ? (row.completed_at as Date).toISOString() : null,
    estimatedDuration: (row.estimated_duration as number | null) || null,
    sourceMetadata: (row.source_metadata as SourceMetadata | null) || null,
    createdAt: (row.created_at as Date)?.toISOString() || '',
    updatedAt: (row.updated_at as Date)?.toISOString() || '',
  }
}

function parseExternalIdMap(row: Record<string, unknown>): ExternalIdMap {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    importJobId: row.import_job_id as string,
    provider: row.provider as ImportProvider,
    externalId: row.external_id as string,
    entityType: row.entity_type as ExternalIdMap['entityType'],
    internalId: row.internal_id as string,
    createdAt: (row.created_at as Date)?.toISOString() || '',
  }
}

function parseImportConflict(row: Record<string, unknown>): ImportConflict {
  return {
    id: row.id as string,
    importJobId: row.import_job_id as string,
    conflictType: row.conflict_type as ImportConflict['conflictType'],
    severity: row.severity as ImportConflict['severity'],
    sourceItem: row.source_item as Record<string, unknown>,
    potentialMatches: (row.potential_matches as Array<Record<string, unknown>>) || [],
    status: row.status as ImportConflict['status'],
    resolution: (row.resolution as ConflictResolution | undefined) || undefined,
    createdAt: (row.created_at as Date)?.toISOString() || '',
  }
}

function parseImportLog(row: Record<string, unknown>): ImportLog {
  return {
    id: row.id as string,
    importJobId: row.import_job_id as string,
    timestamp: (row.timestamp as Date)?.toISOString() || '',
    level: row.level as LogLevel,
    stage: row.stage as ImportStage,
    message: row.message as string,
    metadata: (row.metadata as Record<string, unknown> | undefined) || undefined,
  }
}

// ========================================
// Import Jobs
// ========================================

export const importJobs = {
  /**
   * Create a new import job
   */
  async create(data: {
    organizationId: string
    workspaceId?: string | null
    createdBy: string
    provider: ImportProvider
    fileUrl: string
    fileName: string
    fileSize: number
    config?: Partial<ImportConfig>
    sourceMetadata?: SourceMetadata
  }): Promise<ImportJob> {
    const id = 'imp_' + crypto.randomBytes(12).toString('hex')
    const defaultConfig: ImportConfig = {
      workspaceStrategy: 'single',
      userMappings: [],
      inviteUnmatched: false,
      statusMappings: {},
      priorityMappings: {},
      importTags: true,
      importComments: false,
      importAttachments: false,
      preserveIds: false,
      ...data.config,
    }

    const { rows } = await sql`
      INSERT INTO import_jobs (
        id, organization_id, workspace_id, created_by, provider,
        file_url, file_name, file_size, config, source_metadata
      ) VALUES (
        ${id}, ${data.organizationId}, ${data.workspaceId || null},
        ${data.createdBy}, ${data.provider}, ${data.fileUrl},
        ${data.fileName}, ${data.fileSize},
        ${JSON.stringify(defaultConfig)}::jsonb,
        ${data.sourceMetadata ? JSON.stringify(data.sourceMetadata) : null}::jsonb
      )
      RETURNING *
    `
    return parseImportJob(rows[0])
  },

  /**
   * Find import job by ID
   */
  async findById(id: string): Promise<ImportJob | null> {
    const { rows } = await sql`
      SELECT * FROM import_jobs WHERE id = ${id}
    `
    return rows[0] ? parseImportJob(rows[0]) : null
  },

  /**
   * Find all import jobs for organization
   */
  async findByOrganization(organizationId: string, limit = 50): Promise<ImportJob[]> {
    const { rows } = await sql`
      SELECT * FROM import_jobs
      WHERE organization_id = ${organizationId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return rows.map(parseImportJob)
  },

  /**
   * Update import job
   */
  async update(
    id: string,
    data: {
      status?: ImportStatus
      progress?: number
      config?: Partial<ImportConfig>
      stats?: Partial<ImportStats>
      errors?: ImportError[]
      warnings?: ImportWarning[]
      completedAt?: string | null
      estimatedDuration?: number
    }
  ): Promise<ImportJob | null> {
    // Get current job first
    const current = await this.findById(id)
    if (!current) return null

    // Merge updates with current values
    const status = data.status ?? current.status
    const progress = data.progress ?? current.progress
    const config = data.config
      ? { ...current.config, ...data.config }
      : current.config
    const stats = data.stats
      ? { ...current.stats, ...data.stats }
      : current.stats
    const errors = data.errors ?? current.errors
    const warnings = data.warnings ?? current.warnings
    const completedAt = data.completedAt !== undefined ? data.completedAt : current.completedAt
    const estimatedDuration = data.estimatedDuration ?? current.estimatedDuration

    // Update all fields using tagged template
    const { rows } = await sql`
      UPDATE import_jobs
      SET
        status = ${status},
        progress = ${progress},
        config = ${JSON.stringify(config)}::jsonb,
        stats = ${JSON.stringify(stats)}::jsonb,
        errors = ${JSON.stringify(errors)}::jsonb,
        warnings = ${JSON.stringify(warnings)}::jsonb,
        completed_at = ${completedAt},
        estimated_duration = ${estimatedDuration},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    return rows[0] ? parseImportJob(rows[0]) : null
  },

  /**
   * Delete import job and related data
   */
  async delete(id: string): Promise<boolean> {
    const { rowCount } = await sql`
      DELETE FROM import_jobs WHERE id = ${id}
    `
    return (rowCount ?? 0) > 0
  },
}

// ========================================
// External ID Map (Idempotency)
// ========================================

export const externalIdMap = {
  /**
   * Create external ID mapping
   */
  async create(data: {
    organizationId: string
    importJobId: string
    provider: ImportProvider
    externalId: string
    entityType: 'workspace' | 'user' | 'project' | 'task'
    internalId: string
  }): Promise<ExternalIdMap> {
    const id = 'eim_' + crypto.randomBytes(12).toString('hex')
    const { rows } = await sql`
      INSERT INTO external_id_map (
        id, organization_id, import_job_id, provider,
        external_id, entity_type, internal_id
      ) VALUES (
        ${id}, ${data.organizationId}, ${data.importJobId},
        ${data.provider}, ${data.externalId}, ${data.entityType},
        ${data.internalId}
      )
      ON CONFLICT (organization_id, provider, external_id, entity_type)
      DO UPDATE SET internal_id = ${data.internalId}
      RETURNING *
    `
    return parseExternalIdMap(rows[0])
  },

  /**
   * Find external ID mapping
   */
  async find(params: {
    organizationId: string
    provider: ImportProvider
    externalId: string
    entityType: 'workspace' | 'user' | 'project' | 'task'
  }): Promise<ExternalIdMap | null> {
    const { rows } = await sql`
      SELECT * FROM external_id_map
      WHERE organization_id = ${params.organizationId}
        AND provider = ${params.provider}
        AND external_id = ${params.externalId}
        AND entity_type = ${params.entityType}
    `
    return rows[0] ? parseExternalIdMap(rows[0]) : null
  },

  /**
   * Find all mappings for import job
   */
  async findByJob(importJobId: string): Promise<ExternalIdMap[]> {
    const { rows } = await sql`
      SELECT * FROM external_id_map
      WHERE import_job_id = ${importJobId}
      ORDER BY created_at ASC
    `
    return rows.map(parseExternalIdMap)
  },

  /**
   * Delete all mappings for import job (for rollback)
   */
  async deleteByJob(importJobId: string): Promise<number> {
    const { rowCount } = await sql`
      DELETE FROM external_id_map WHERE import_job_id = ${importJobId}
    `
    return rowCount ?? 0
  },
}

// ========================================
// Import Conflicts
// ========================================

export const importConflicts = {
  /**
   * Create conflict
   */
  async create(data: {
    importJobId: string
    conflictType: ImportConflict['conflictType']
    severity: ImportConflict['severity']
    sourceItem: Record<string, unknown>
    potentialMatches?: Array<Record<string, unknown>>
  }): Promise<ImportConflict> {
    const id = 'ic_' + crypto.randomBytes(12).toString('hex')
    const { rows } = await sql`
      INSERT INTO import_conflicts (
        id, import_job_id, conflict_type, severity,
        source_item, potential_matches
      ) VALUES (
        ${id}, ${data.importJobId}, ${data.conflictType},
        ${data.severity}, ${JSON.stringify(data.sourceItem)}::jsonb,
        ${data.potentialMatches ? `{${data.potentialMatches.map((m) => `"${JSON.stringify(m).replace(/"/g, '\\"')}"`).join(',')}}` : '{}'}
      )
      RETURNING *
    `
    return parseImportConflict(rows[0])
  },

  /**
   * Find conflicts by job
   */
  async findByJob(importJobId: string): Promise<ImportConflict[]> {
    const { rows } = await sql`
      SELECT * FROM import_conflicts
      WHERE import_job_id = ${importJobId}
      ORDER BY created_at ASC
    `
    return rows.map(parseImportConflict)
  },

  /**
   * Resolve conflict
   */
  async resolve(
    id: string,
    resolution: ConflictResolution
  ): Promise<ImportConflict | null> {
    const { rows } = await sql`
      UPDATE import_conflicts
      SET status = 'resolved', resolution = ${JSON.stringify(resolution)}::jsonb
      WHERE id = ${id}
      RETURNING *
    `
    return rows[0] ? parseImportConflict(rows[0]) : null
  },
}

// ========================================
// Import Logs
// ========================================

export const importLogs = {
  /**
   * Create log entry
   */
  async create(data: {
    importJobId: string
    level: LogLevel
    stage: ImportStage
    message: string
    metadata?: Record<string, unknown>
  }): Promise<ImportLog> {
    const id = 'il_' + crypto.randomBytes(12).toString('hex')
    const { rows } = await sql`
      INSERT INTO import_logs (
        id, import_job_id, level, stage, message, metadata
      ) VALUES (
        ${id}, ${data.importJobId}, ${data.level}, ${data.stage},
        ${data.message}, ${data.metadata ? JSON.stringify(data.metadata) : null}::jsonb
      )
      RETURNING *
    `
    return parseImportLog(rows[0])
  },

  /**
   * Find logs by job
   */
  async findByJob(
    importJobId: string,
    options?: { level?: LogLevel; limit?: number }
  ): Promise<ImportLog[]> {
    const limit = options?.limit || 100

    const { rows } = options?.level
      ? await sql`
          SELECT * FROM import_logs
          WHERE import_job_id = ${importJobId} AND level = ${options.level}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT * FROM import_logs
          WHERE import_job_id = ${importJobId}
          ORDER BY timestamp DESC
          LIMIT ${limit}
        `

    return rows.map(parseImportLog)
  },

  /**
   * Delete logs for job
   */
  async deleteByJob(importJobId: string): Promise<number> {
    const { rowCount } = await sql`
      DELETE FROM import_logs WHERE import_job_id = ${importJobId}
    `
    return rowCount ?? 0
  },
}
