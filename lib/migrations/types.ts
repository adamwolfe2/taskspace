/**
 * Migration Center Type Definitions
 * Shared types for import/export functionality
 */

// ========================================
// Provider Types
// ========================================

export type ImportProvider = 'trello' | 'asana' | 'generic_csv'

export type ImportStatus =
  | 'uploading'
  | 'validating'
  | 'mapping'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type ImportStage =
  | 'validation'
  | 'mapping'
  | 'workspace_creation'
  | 'project_creation'
  | 'task_import'
  | 'finalization'

// ========================================
// Import Job
// ========================================

export interface ImportJob {
  id: string
  organizationId: string
  workspaceId: string | null // null = multi-workspace import
  createdBy: string
  provider: ImportProvider
  status: ImportStatus
  progress: number // 0-100
  fileUrl: string // Vercel Blob URL
  fileName: string
  fileSize: number
  config: ImportConfig
  stats: ImportStats
  errors: ImportError[]
  warnings: ImportWarning[]
  startedAt: string
  completedAt: string | null
  estimatedDuration: number | null // seconds
  sourceMetadata: SourceMetadata | null
  createdAt: string
  updatedAt: string
}

export interface ImportConfig {
  // Workspace strategy
  workspaceStrategy: 'single' | 'multi'
  targetWorkspaceId?: string // For single workspace imports
  workspaceMappings?: WorkspaceMapping[] // For multi-workspace imports

  // User mapping
  userMappings: UserMapping[]
  inviteUnmatched: boolean

  // Entity preferences
  statusMappings: Record<string, string> // source status → TaskSpace status
  priorityMappings: Record<string, string> // source priority → TaskSpace priority
  defaultStatus?: string
  defaultPriority?: string

  // Import options
  importTags: boolean
  importComments: boolean // Future
  importAttachments: boolean // Future
  preserveIds: boolean // Store original IDs in task description
}

export interface ImportStats {
  // Entity counts
  workspacesCreated: number
  workspacesSkipped: number
  projectsCreated: number
  projectsSkipped: number
  tasksCreated: number
  tasksUpdated: number
  tasksSkipped: number
  tasksFailed: number
  usersInvited: number
  tagsCreated: number

  // Timing (milliseconds)
  validationDuration?: number
  mappingDuration?: number
  importDuration?: number
  totalDuration?: number

  // Source data counts
  sourceWorkspaces?: number
  sourceProjects?: number
  sourceTasks?: number
  sourceUsers?: number
}

export interface ImportError {
  code: string
  message: string
  context?: Record<string, unknown>
  timestamp?: string
}

export interface ImportWarning {
  code: string
  message: string
  context?: Record<string, unknown>
  timestamp?: string
}

// ========================================
// Source Metadata
// ========================================

export interface SourceMetadata {
  // Trello
  boardName?: string
  boardId?: string
  lists?: Array<{ id: string; name: string }>

  // Asana
  projectName?: string
  projectId?: string
  sections?: Array<{ id: string; name: string }>

  // Generic CSV
  columns?: string[]
  rowCount?: number
  detectedFormat?: string
}

// ========================================
// Workspace & User Mapping
// ========================================

export interface WorkspaceMapping {
  sourceId: string // Trello board ID, Asana project ID, etc.
  sourceName: string
  targetWorkspaceId?: string // If mapping to existing workspace
  createNew: boolean
  newWorkspaceName?: string
  workspaceType?: 'Leadership' | 'Department' | 'Team' | 'Project'
}

export interface UserMapping {
  sourceEmail: string | null
  sourceName: string
  sourceId?: string // Provider's user ID
  targetUserId: string | null // TaskSpace user ID
  matchType: 'exact' | 'fuzzy' | 'manual' | 'none'
  confidence?: number // 0-100 for fuzzy matches
  action: 'map' | 'invite' | 'skip'
}

// ========================================
// Normalized Data Format
// ========================================

export interface NormalizedData {
  workspaces: NormalizedWorkspace[]
  users: NormalizedUser[]
  projects: NormalizedProject[]
  tasks: NormalizedTask[]
  tags: string[]
}

export interface NormalizedWorkspace {
  externalId: string
  name: string
  type?: 'Leadership' | 'Department' | 'Team' | 'Project'
  description?: string
  metadata?: Record<string, unknown>
}

export interface NormalizedUser {
  externalId: string
  email: string | null
  name: string
  avatarUrl?: string
  metadata?: Record<string, unknown>
}

export interface NormalizedProject {
  externalId: string
  workspaceExternalId: string // Maps to NormalizedWorkspace
  name: string
  description?: string
  color?: string
  metadata?: Record<string, unknown>
}

export interface NormalizedTask {
  externalId: string
  projectExternalId?: string // Maps to NormalizedProject
  workspaceExternalId: string // Maps to NormalizedWorkspace
  title: string
  description?: string
  status: string
  priority?: string
  assigneeExternalIds: string[] // Maps to NormalizedUser
  dueDate?: string | null
  tags: string[]
  position?: number
  metadata?: Record<string, unknown>
}

// ========================================
// External ID Mapping
// ========================================

export interface ExternalIdMap {
  id: string
  organizationId: string
  importJobId: string
  provider: ImportProvider
  externalId: string
  entityType: 'workspace' | 'user' | 'project' | 'task'
  internalId: string
  createdAt: string
}

// ========================================
// Conflict Resolution
// ========================================

export type ConflictType =
  | 'duplicate_task'
  | 'ambiguous_user_mapping'
  | 'invalid_data'
  | 'missing_required_field'

export type ConflictSeverity = 'blocking' | 'warning'

export type ConflictStatus = 'pending' | 'resolved' | 'skipped'

export interface ImportConflict {
  id: string
  importJobId: string
  conflictType: ConflictType
  severity: ConflictSeverity
  sourceItem: Record<string, unknown>
  potentialMatches: Array<Record<string, unknown>>
  status: ConflictStatus
  resolution?: ConflictResolution
  createdAt: string
}

export interface ConflictResolution {
  action: 'merge' | 'skip' | 'create_new'
  targetId?: string
  notes?: string
  resolvedBy: string
  resolvedAt: string
}

// ========================================
// Import Logs
// ========================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ImportLog {
  id: string
  importJobId: string
  timestamp: string
  level: LogLevel
  stage: ImportStage
  message: string
  metadata?: Record<string, unknown>
}

// ========================================
// Validation Results
// ========================================

export interface ValidationResult {
  valid: boolean
  errors: ImportError[]
  warnings: ImportWarning[]
  metadata?: {
    detectedProvider?: ImportProvider
    estimatedItems?: number
    fileFormat?: string
  }
}

// ========================================
// Processing Results
// ========================================

export interface ChunkProcessingResult {
  processed: number
  succeeded: number
  failed: number
  hasMore: boolean
  nextOffset: number
  errors: ImportError[]
}

// ========================================
// API Request/Response Types
// ========================================

export interface CreateImportJobRequest {
  provider: ImportProvider
  workspaceId?: string | null
  fileName: string
  fileSize: number
  fileUrl: string
}

export interface CreateImportJobResponse {
  jobId: string
  status: ImportStatus
}

export interface GetImportJobResponse {
  job: ImportJob
  conflicts?: ImportConflict[]
  recentLogs?: ImportLog[]
}

export interface UpdateConfigRequest {
  config: Partial<ImportConfig>
}

export interface ProcessChunkRequest {
  offset: number
  limit: number
}

export interface ProcessChunkResponse extends ChunkProcessingResult {
  progress: number // 0-100
  estimatedTimeRemaining?: number // seconds
}

export interface FinalizeImportRequest {
  // Optional final cleanup settings
}

export interface FinalizeImportResponse {
  success: boolean
  stats: ImportStats
  errors: ImportError[]
  warnings: ImportWarning[]
}
