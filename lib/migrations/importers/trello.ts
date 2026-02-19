/**
 * Trello JSON Importer
 * Parses Trello board export JSON files
 * Export format: Board → Lists → Cards
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
// Trello JSON Format Types
// ========================================

interface TrelloExport {
  id: string
  name: string
  desc?: string
  lists: TrelloList[]
  cards: TrelloCard[]
  members: TrelloMember[]
  labels: TrelloLabel[]
  closed?: boolean
  [key: string]: unknown
}

interface TrelloList {
  id: string
  name: string
  closed: boolean
  pos: number
  [key: string]: unknown
}

interface TrelloCard {
  id: string
  name: string
  desc?: string
  idList: string
  idMembers: string[]
  idLabels: string[]
  due?: string | null
  dueComplete?: boolean
  closed: boolean
  pos: number
  [key: string]: unknown
}

interface TrelloMember {
  id: string
  fullName: string
  username: string
  initials?: string
  avatarUrl?: string
  [key: string]: unknown
}

interface TrelloLabel {
  id: string
  name: string
  color: string
  [key: string]: unknown
}

// ========================================
// Trello Importer Implementation
// ========================================

export class TrelloImporter extends BaseImporter {
  readonly provider: ImportProvider = 'trello'
  readonly supportedFormats = ['.json']

  /**
   * Detect if file is a Trello export
   * Check for required Trello JSON structure
   */
  detect(file: File | Buffer, fileName: string): boolean {
    // Quick check: must be JSON file
    if (!fileName.toLowerCase().endsWith('.json')) {
      return false
    }

    // If we have buffer, try parsing to check structure
    if (Buffer.isBuffer(file)) {
      try {
        const data = JSON.parse(file.toString('utf-8'))
        return this.isTrelloExport(data)
      } catch {
        return false
      }
    }

    // For File objects, we can't read content in detect()
    // Return true if filename suggests Trello
    return true
  }

  /**
   * Validate Trello export structure
   */
  async validate(raw: unknown): Promise<ValidationResult> {
    const errors: ImportError[] = []
    const warnings: ImportWarning[] = []

    // Check if valid JSON object
    if (typeof raw !== 'object' || raw === null) {
      errors.push(
        this.createError('INVALID_FORMAT', 'File must be a valid JSON object')
      )
      return { valid: false, errors, warnings }
    }

    const data = raw as Record<string, unknown>

    // Check required Trello fields
    if (!this.validateRequired(data.id, 'id', errors)) {
      return { valid: false, errors, warnings }
    }
    if (!this.validateRequired(data.name, 'name', errors)) {
      return { valid: false, errors, warnings }
    }

    // Check arrays
    if (!Array.isArray(data.lists)) {
      errors.push(this.createError('INVALID_FORMAT', 'Missing or invalid "lists" array'))
    }
    if (!Array.isArray(data.cards)) {
      errors.push(this.createError('INVALID_FORMAT', 'Missing or invalid "cards" array'))
    }
    if (!Array.isArray(data.members)) {
      warnings.push(
        this.createWarning('MISSING_MEMBERS', 'No members found in export')
      )
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings }
    }

    // Success - return metadata
    const trelloData = data as TrelloExport
    const _activeLists = trelloData.lists?.filter((l) => !l.closed) || []
    const activeCards = trelloData.cards?.filter((c) => !c.closed) || []

    return {
      valid: true,
      errors: [],
      warnings,
      metadata: {
        detectedProvider: 'trello',
        estimatedItems: activeCards.length,
        fileFormat: 'trello_json',
      },
    }
  }

  /**
   * Normalize Trello data to TaskSpace format
   * Mapping:
   * - Board → Workspace
   * - List → Project
   * - Card → Task
   * - Member → User
   * - Label → Tag
   */
  async normalize(raw: unknown): Promise<NormalizedData> {
    const data = raw as TrelloExport

    // Filter out archived/closed items
    const activeLists = data.lists.filter((l) => !l.closed)
    const activeCards = data.cards.filter((c) => !c.closed)

    // 1. Normalize workspace (board)
    const workspace: NormalizedWorkspace = {
      externalId: data.id,
      name: data.name,
      description: data.desc,
      type: 'Project', // Default to Project workspace
      metadata: {
        source: 'trello',
        originalBoardId: data.id,
      },
    }

    // 2. Normalize users (members)
    const users: NormalizedUser[] = (data.members || []).map((member) => ({
      externalId: member.id,
      email: null, // Trello exports don't include email addresses
      name: member.fullName || member.username,
      avatarUrl: member.avatarUrl,
      metadata: {
        trelloUsername: member.username,
        initials: member.initials,
      },
    }))

    // 3. Normalize projects (lists)
    const projects: NormalizedProject[] = activeLists
      .sort((a, b) => a.pos - b.pos)
      .map((list) => ({
        externalId: list.id,
        workspaceExternalId: data.id,
        name: list.name,
        metadata: {
          trelloListId: list.id,
          position: list.pos,
        },
      }))

    // 4. Build label (tag) lookup
    const labelMap = new Map<string, string>()
    ;(data.labels || []).forEach((label) => {
      if (label.name) {
        labelMap.set(label.id, label.name)
      }
    })

    // Extract unique tag names
    const tagSet = new Set<string>()
    activeCards.forEach((card) => {
      ;(card.idLabels || []).forEach((labelId) => {
        const tagName = labelMap.get(labelId)
        if (tagName) {
          tagSet.add(this.normalizeTagName(tagName))
        }
      })
    })

    // 5. Normalize tasks (cards)
    const tasks: NormalizedTask[] = activeCards
      .sort((a, b) => a.pos - b.pos)
      .map((card) => {
        // Map Trello labels to tags
        const tags = (card.idLabels || [])
          .map((labelId) => labelMap.get(labelId))
          .filter((name): name is string => !!name)
          .map((name) => this.normalizeTagName(name))

        // Determine status based on list name and due date completion
        const listName = activeLists.find((l) => l.id === card.idList)?.name || ''
        const status = this.mapTrelloStatus(listName, card.dueComplete)

        return {
          externalId: card.id,
          projectExternalId: card.idList,
          workspaceExternalId: data.id,
          title: card.name,
          description: this.sanitizeHtml(card.desc),
          status,
          priority: undefined, // Trello doesn't have native priority
          assigneeExternalIds: card.idMembers || [],
          dueDate: this.parseDate(card.due),
          tags,
          position: card.pos,
          metadata: {
            trelloCardId: card.id,
            trelloListId: card.idList,
            dueComplete: card.dueComplete,
          },
        }
      })

    return {
      workspaces: [workspace],
      users,
      projects,
      tasks,
      tags: Array.from(tagSet),
    }
  }

  // ========================================
  // Trello-Specific Helper Methods
  // ========================================

  /**
   * Check if data structure matches Trello export
   */
  private isTrelloExport(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) return false
    const obj = data as Record<string, unknown>
    return (
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      Array.isArray(obj.lists) &&
      Array.isArray(obj.cards)
    )
  }

  /**
   * Map Trello list name to TaskSpace status
   * Common patterns: "To Do", "In Progress", "Done", "Backlog"
   */
  private mapTrelloStatus(listName: string, dueComplete?: boolean): string {
    const normalized = listName.toLowerCase().trim()

    // Check for common "done" patterns
    if (
      dueComplete ||
      normalized.includes('done') ||
      normalized.includes('complete') ||
      normalized.includes('finished') ||
      normalized.includes('archive')
    ) {
      return 'completed'
    }

    // Check for "in progress" patterns
    if (
      normalized.includes('progress') ||
      normalized.includes('doing') ||
      normalized.includes('working') ||
      normalized.includes('active')
    ) {
      return 'in-progress'
    }

    // Check for "blocked" patterns
    if (
      normalized.includes('blocked') ||
      normalized.includes('waiting') ||
      normalized.includes('hold')
    ) {
      return 'blocked'
    }

    // Check for "backlog" patterns
    if (
      normalized.includes('backlog') ||
      normalized.includes('future') ||
      normalized.includes('later')
    ) {
      return 'not-started'
    }

    // Default to "not-started" for anything else
    return 'not-started'
  }
}
