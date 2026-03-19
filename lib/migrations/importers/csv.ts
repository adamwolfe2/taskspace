/**
 * Generic CSV Importer
 * Parses any CSV file with header row into TaskSpace format
 * Uses fuzzy column name matching to map common headers
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
// Column Name Matching
// ========================================

/** Known column aliases grouped by target field */
const COLUMN_ALIASES: Record<string, string[]> = {
  title: ['title', 'name', 'task', 'task name', 'task title', 'summary', 'subject', 'item', 'to do', 'todo'],
  description: ['description', 'details', 'notes', 'body', 'content', 'desc', 'comment', 'comments'],
  status: ['status', 'state', 'stage', 'column', 'list', 'progress'],
  assignee: ['assignee', 'assigned to', 'assigned', 'owner', 'user', 'member', 'responsible', 'who'],
  dueDate: ['due date', 'due', 'deadline', 'due_date', 'duedate', 'end date', 'target date', 'date'],
  project: ['project', 'list', 'category', 'group', 'board', 'workspace', 'section', 'folder', 'team'],
  priority: ['priority', 'urgency', 'importance', 'level', 'severity'],
  tags: ['tags', 'labels', 'tag', 'label', 'categories'],
}

/**
 * Match a header string to a known field using fuzzy matching
 */
function matchColumn(header: string): string | null {
  const normalized = header.toLowerCase().trim().replace(/[_\-./]/g, ' ')

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (normalized === alias || normalized.replace(/\s+/g, '') === alias.replace(/\s+/g, '')) {
        return field
      }
    }
  }

  // Partial match fallback — check if header contains an alias
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return field
      }
    }
  }

  return null
}

// ========================================
// CSV Parsing
// ========================================

interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
}

/**
 * Parse CSV text into headers + row objects.
 * Handles quoted fields, embedded commas, and newlines within quotes.
 */
function parseCSV(text: string): ParsedCSV {
  const lines = splitCSVLines(text)
  if (lines.length === 0) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.every(v => v.trim() === '')) continue // skip blank rows

    const row: Record<string, string> = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? ''
    }
    rows.push(row)
  }

  return { headers, rows }
}

/** Split CSV text into logical lines (respecting quoted newlines) */
function splitCSVLines(text: string): string[] {
  const lines: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
        current += char
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[i + 1] === '\n') i++ // skip \r\n
      if (current.trim()) lines.push(current)
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) lines.push(current)
  return lines
}

/** Parse a single CSV line into values */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

// ========================================
// Status Mapping
// ========================================

function mapStatus(rawStatus: string): string {
  const normalized = rawStatus.toLowerCase().trim()

  if (['done', 'complete', 'completed', 'finished', 'closed', 'resolved'].includes(normalized)) {
    return 'completed'
  }
  if (['in progress', 'in-progress', 'active', 'doing', 'working', 'started', 'wip'].includes(normalized)) {
    return 'in-progress'
  }
  if (['blocked', 'on hold', 'waiting', 'hold', 'stuck', 'paused'].includes(normalized)) {
    return 'blocked'
  }

  return 'not-started'
}

// ========================================
// CSV Importer Implementation
// ========================================

export class GenericCSVImporter extends BaseImporter {
  readonly provider: ImportProvider = 'generic_csv'
  readonly supportedFormats = ['.csv']

  detect(file: File | Buffer, fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.csv')
  }

  async validate(raw: unknown): Promise<ValidationResult> {
    const errors: ImportError[] = []
    const warnings: ImportWarning[] = []

    if (typeof raw !== 'string') {
      errors.push(this.createError('INVALID_FORMAT', 'CSV file must contain text data'))
      return { valid: false, errors, warnings }
    }

    const text = raw as string
    if (text.trim().length === 0) {
      errors.push(this.createError('EMPTY_FILE', 'CSV file is empty'))
      return { valid: false, errors, warnings }
    }

    const { headers, rows } = parseCSV(text)

    if (headers.length === 0) {
      errors.push(this.createError('NO_HEADERS', 'CSV file has no header row'))
      return { valid: false, errors, warnings }
    }

    if (rows.length === 0) {
      errors.push(this.createError('NO_DATA', 'CSV file has no data rows'))
      return { valid: false, errors, warnings }
    }

    // Check for a title/name column
    const columnMap = this.buildColumnMap(headers)
    if (!columnMap.title) {
      warnings.push(
        this.createWarning(
          'NO_TITLE_COLUMN',
          'No title/name column detected. The first column will be used as the task title.',
          { headers, firstColumn: headers[0] }
        )
      )
    }

    // Report unmapped columns
    const mappedColumns = new Set(Object.values(columnMap).filter(Boolean))
    const unmappedHeaders = headers.filter(h => !mappedColumns.has(h))
    if (unmappedHeaders.length > 0) {
      warnings.push(
        this.createWarning(
          'UNMAPPED_COLUMNS',
          `${unmappedHeaders.length} column(s) were not auto-mapped: ${unmappedHeaders.join(', ')}`,
          { unmappedHeaders }
        )
      )
    }

    return {
      valid: true,
      errors: [],
      warnings,
      metadata: {
        detectedProvider: 'generic_csv',
        estimatedItems: rows.length,
        fileFormat: 'csv',
        columns: headers,
        rowCount: rows.length,
      } as ValidationResult['metadata'] & { columns: string[]; rowCount: number },
    }
  }

  async normalize(raw: unknown): Promise<NormalizedData> {
    const text = raw as string
    const { headers, rows } = parseCSV(text)
    const columnMap = this.buildColumnMap(headers)

    // Use first column as title fallback
    const titleCol = columnMap.title || headers[0]
    const descCol = columnMap.description
    const statusCol = columnMap.status
    const assigneeCol = columnMap.assignee
    const dueDateCol = columnMap.dueDate
    const projectCol = columnMap.project
    const priorityCol = columnMap.priority
    const tagsCol = columnMap.tags

    // Create default workspace
    const workspace: NormalizedWorkspace = {
      externalId: 'csv_import',
      name: 'CSV Import',
      type: 'Project',
      metadata: { source: 'generic_csv' },
    }

    // Collect unique projects, users, tags
    const projectSet = new Map<string, NormalizedProject>()
    const userSet = new Map<string, NormalizedUser>()
    const tagSet = new Set<string>()

    const tasks: NormalizedTask[] = rows.map((row, index) => {
      const title = row[titleCol] || `Task ${index + 1}`

      // Project
      const projectName = projectCol ? row[projectCol]?.trim() : undefined
      let projectExternalId: string | undefined
      if (projectName) {
        const projectKey = projectName.toLowerCase()
        if (!projectSet.has(projectKey)) {
          projectSet.set(projectKey, {
            externalId: `csv_project_${projectKey}`,
            workspaceExternalId: workspace.externalId,
            name: projectName,
          })
        }
        projectExternalId = projectSet.get(projectKey)!.externalId
      }

      // Assignee
      const assigneeName = assigneeCol ? row[assigneeCol]?.trim() : undefined
      const assigneeExternalIds: string[] = []
      if (assigneeName) {
        const assigneeKey = assigneeName.toLowerCase()
        if (!userSet.has(assigneeKey)) {
          userSet.set(assigneeKey, {
            externalId: `csv_user_${assigneeKey}`,
            email: assigneeName.includes('@') ? assigneeName : null,
            name: assigneeName,
          })
        }
        assigneeExternalIds.push(userSet.get(assigneeKey)!.externalId)
      }

      // Tags
      const rawTags = tagsCol ? row[tagsCol]?.trim() : undefined
      const taskTags: string[] = []
      if (rawTags) {
        rawTags.split(/[,;|]/).forEach(tag => {
          const normalized = this.normalizeTagName(tag)
          if (normalized) {
            tagSet.add(normalized)
            taskTags.push(normalized)
          }
        })
      }

      // Status
      const rawStatus = statusCol ? row[statusCol]?.trim() : ''
      const status = rawStatus ? mapStatus(rawStatus) : 'not-started'

      return {
        externalId: this.generateRowHash(row),
        projectExternalId,
        workspaceExternalId: workspace.externalId,
        title,
        description: descCol ? row[descCol]?.trim() : undefined,
        status,
        priority: priorityCol ? row[priorityCol]?.trim()?.toLowerCase() : undefined,
        assigneeExternalIds,
        dueDate: dueDateCol ? this.parseDate(row[dueDateCol]) : undefined,
        tags: taskTags,
        position: index,
        metadata: {
          csvRowIndex: index + 2, // +2 for 1-based + header row
          originalRow: row,
        },
      }
    })

    return {
      workspaces: [workspace],
      users: Array.from(userSet.values()),
      projects: Array.from(projectSet.values()),
      tasks,
      tags: Array.from(tagSet),
    }
  }

  // ========================================
  // Private Helpers
  // ========================================

  private buildColumnMap(headers: string[]): Record<string, string | null> {
    const map: Record<string, string | null> = {
      title: null,
      description: null,
      status: null,
      assignee: null,
      dueDate: null,
      project: null,
      priority: null,
      tags: null,
    }

    const used = new Set<string>()

    for (const header of headers) {
      const field = matchColumn(header)
      if (field && !map[field] && !used.has(header)) {
        map[field] = header
        used.add(header)
      }
    }

    return map
  }
}
