/**
 * Slack Bot Integration Database Operations
 *
 * Provides CRUD operations for Slack installations, user mappings,
 * and EOD conversation tracking.
 */

import crypto from "crypto"
import { sql } from "./sql"
import { encryptToken, decryptToken } from "@/lib/crypto/token-encryption"
import type {
  SlackInstallation,
  SlackUserMapping,
  SlackConversation,
  SlackConversationState,
} from "@/lib/types"

// ============================================
// TERMINAL STATES (conversations that are "done")
// ============================================

const TERMINAL_STATES: SlackConversationState[] = ["submitted", "cancelled", "expired"]

// ============================================
// PARSERS
// ============================================

function parseInstallation(row: Record<string, unknown>): SlackInstallation {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    slackTeamId: row.slack_team_id as string,
    slackTeamName: row.slack_team_name as string,
    botToken: decryptToken(row.bot_token as string) || "",
    botUserId: row.bot_user_id as string,
    installerUserId: row.installer_user_id as string,
    enabled: row.enabled as boolean,
    installedAt: (row.installed_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
  }
}

function parseUserMapping(row: Record<string, unknown>): SlackUserMapping {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    userId: row.user_id as string,
    slackUserId: row.slack_user_id as string,
    slackEmail: (row.slack_email as string) || undefined,
    enabled: row.enabled as boolean,
    linkedAt: (row.linked_at as Date)?.toISOString() || "",
  }
}

function parseConversation(row: Record<string, unknown>): SlackConversation {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    userId: row.user_id as string,
    slackUserId: row.slack_user_id as string,
    slackChannelId: row.slack_channel_id as string,
    workspaceId: (row.workspace_id as string) || undefined,
    state: row.state as SlackConversationState,
    reportDate: row.report_date as string,
    collectedText: (row.collected_text as string) || undefined,
    parsedReport: (row.parsed_report as Record<string, unknown>) || undefined,
    rocksContext: (row.rocks_context as Record<string, unknown>) || undefined,
    messageTs: (row.message_ts as string) || undefined,
    createdAt: (row.created_at as Date)?.toISOString() || "",
    updatedAt: (row.updated_at as Date)?.toISOString() || "",
    expiresAt: (row.expires_at as Date)?.toISOString() || "",
  }
}

// ============================================
// EXPORTED DB OBJECT
// ============================================

export const slackDb = {
  // ------------------------------------------
  // INSTALLATIONS
  // ------------------------------------------
  installations: {
    async findByOrgId(orgId: string): Promise<SlackInstallation | null> {
      const { rows } = await sql`
        SELECT * FROM slack_installations
        WHERE organization_id = ${orgId}
        LIMIT 1
      `
      if (rows.length === 0) return null
      return parseInstallation(rows[0])
    },

    async findAllEnabled(): Promise<SlackInstallation[]> {
      const { rows } = await sql`
        SELECT * FROM slack_installations
        WHERE enabled = true
      `
      return rows.map(parseInstallation)
    },

    async findByTeamId(teamId: string): Promise<SlackInstallation | null> {
      const { rows } = await sql`
        SELECT * FROM slack_installations
        WHERE slack_team_id = ${teamId}
        LIMIT 1
      `
      if (rows.length === 0) return null
      return parseInstallation(rows[0])
    },

    async create(data: {
      organizationId: string
      slackTeamId: string
      slackTeamName: string
      botToken: string
      botUserId: string
      installerUserId: string
    }): Promise<SlackInstallation> {
      const id = crypto.randomUUID()
      const encryptedToken = encryptToken(data.botToken)

      const { rows } = await sql`
        INSERT INTO slack_installations (
          id, organization_id, slack_team_id, slack_team_name,
          bot_token, bot_user_id, installer_user_id
        )
        VALUES (
          ${id}, ${data.organizationId}, ${data.slackTeamId}, ${data.slackTeamName},
          ${encryptedToken}, ${data.botUserId}, ${data.installerUserId}
        )
        RETURNING *
      `

      return parseInstallation(rows[0])
    },

    async update(
      orgId: string,
      data: Partial<Pick<SlackInstallation, "enabled" | "botToken" | "slackTeamName">>
    ): Promise<void> {
      // Build update fields dynamically
      if (data.botToken !== undefined) {
        const encryptedToken = encryptToken(data.botToken)
        await sql`
          UPDATE slack_installations
          SET bot_token = ${encryptedToken},
              enabled = COALESCE(${data.enabled ?? null}, enabled),
              slack_team_name = COALESCE(${data.slackTeamName ?? null}, slack_team_name),
              updated_at = NOW()
          WHERE organization_id = ${orgId}
        `
      } else {
        await sql`
          UPDATE slack_installations
          SET enabled = COALESCE(${data.enabled ?? null}, enabled),
              slack_team_name = COALESCE(${data.slackTeamName ?? null}, slack_team_name),
              updated_at = NOW()
          WHERE organization_id = ${orgId}
        `
      }
    },

    async delete(orgId: string): Promise<void> {
      await sql`
        DELETE FROM slack_installations
        WHERE organization_id = ${orgId}
      `
    },
  },

  // ------------------------------------------
  // USER MAPPINGS
  // ------------------------------------------
  userMappings: {
    async findBySlackUserId(orgId: string, slackUserId: string): Promise<SlackUserMapping | null> {
      const { rows } = await sql`
        SELECT * FROM slack_user_mappings
        WHERE organization_id = ${orgId}
          AND slack_user_id = ${slackUserId}
        LIMIT 1
      `
      if (rows.length === 0) return null
      return parseUserMapping(rows[0])
    },

    async findByUserId(orgId: string, userId: string): Promise<SlackUserMapping | null> {
      const { rows } = await sql`
        SELECT * FROM slack_user_mappings
        WHERE organization_id = ${orgId}
          AND user_id = ${userId}
        LIMIT 1
      `
      if (rows.length === 0) return null
      return parseUserMapping(rows[0])
    },

    async findAllByOrg(orgId: string): Promise<SlackUserMapping[]> {
      const { rows } = await sql`
        SELECT * FROM slack_user_mappings
        WHERE organization_id = ${orgId}
        ORDER BY linked_at ASC
      `
      return rows.map(parseUserMapping)
    },

    async create(data: {
      organizationId: string
      userId: string
      slackUserId: string
      slackEmail?: string
    }): Promise<SlackUserMapping> {
      const id = crypto.randomUUID()

      const { rows } = await sql`
        INSERT INTO slack_user_mappings (
          id, organization_id, user_id, slack_user_id, slack_email
        )
        VALUES (
          ${id}, ${data.organizationId}, ${data.userId},
          ${data.slackUserId}, ${data.slackEmail ?? null}
        )
        RETURNING *
      `

      return parseUserMapping(rows[0])
    },

    async delete(orgId: string, userId: string): Promise<void> {
      await sql`
        DELETE FROM slack_user_mappings
        WHERE organization_id = ${orgId}
          AND user_id = ${userId}
      `
    },

    async setEnabled(orgId: string, userId: string, enabled: boolean): Promise<void> {
      await sql`
        UPDATE slack_user_mappings
        SET enabled = ${enabled}
        WHERE organization_id = ${orgId}
          AND user_id = ${userId}
      `
    },

    // Aliases used by admin and cron routes
    async findByOrgId(orgId: string): Promise<SlackUserMapping[]> {
      return this.findAllByOrg(orgId)
    },

    async findEnabledByOrgId(orgId: string): Promise<SlackUserMapping[]> {
      const { rows } = await sql`
        SELECT * FROM slack_user_mappings
        WHERE organization_id = ${orgId}
          AND enabled = true
        ORDER BY linked_at ASC
      `
      return rows.map(parseUserMapping)
    },

    async findByUserAndOrg(userId: string, orgId: string): Promise<SlackUserMapping | null> {
      return this.findByUserId(orgId, userId)
    },

    async updateByUserAndOrg(orgId: string, userId: string, data: { enabled: boolean }): Promise<void> {
      return this.setEnabled(orgId, userId, data.enabled)
    },

    async deleteByOrgId(orgId: string): Promise<void> {
      await sql`
        DELETE FROM slack_user_mappings
        WHERE organization_id = ${orgId}
      `
    },

    async deleteByUserAndOrg(userId: string, orgId: string): Promise<void> {
      return this.delete(orgId, userId)
    },
  },

  // ------------------------------------------
  // CONVERSATIONS
  // ------------------------------------------
  conversations: {
    async findActive(userId: string, reportDate: string): Promise<SlackConversation | null> {
      const { rows } = await sql`
        SELECT * FROM slack_conversations
        WHERE user_id = ${userId}
          AND report_date = ${reportDate}
          AND state NOT IN ('submitted', 'cancelled', 'expired')
        ORDER BY created_at DESC
        LIMIT 1
      `
      if (rows.length === 0) return null
      return parseConversation(rows[0])
    },

    async findById(id: string): Promise<SlackConversation | null> {
      const { rows } = await sql`
        SELECT * FROM slack_conversations
        WHERE id = ${id}
        LIMIT 1
      `
      if (rows.length === 0) return null
      return parseConversation(rows[0])
    },

    async findBySlackUser(slackUserId: string, state?: string): Promise<SlackConversation | null> {
      if (state) {
        const { rows } = await sql`
          SELECT * FROM slack_conversations
          WHERE slack_user_id = ${slackUserId}
            AND state = ${state}
          ORDER BY created_at DESC
          LIMIT 1
        `
        if (rows.length === 0) return null
        return parseConversation(rows[0])
      }

      // Find the most recent non-terminal conversation
      const { rows } = await sql`
        SELECT * FROM slack_conversations
        WHERE slack_user_id = ${slackUserId}
          AND state NOT IN ('submitted', 'cancelled', 'expired')
        ORDER BY created_at DESC
        LIMIT 1
      `
      if (rows.length === 0) return null
      return parseConversation(rows[0])
    },

    async create(data: {
      organizationId: string
      userId: string
      slackUserId: string
      slackChannelId: string
      workspaceId?: string
      reportDate: string
      rocksContext?: unknown
      expiresAt?: Date
    }): Promise<SlackConversation> {
      const id = crypto.randomUUID()
      // Default expiry: 4 hours from now
      const expiresAt = data.expiresAt ?? new Date(Date.now() + 4 * 60 * 60 * 1000)
      const rocksContextJson = data.rocksContext ? JSON.stringify(data.rocksContext) : null

      const { rows } = await sql`
        INSERT INTO slack_conversations (
          id, organization_id, user_id, slack_user_id, slack_channel_id,
          workspace_id, report_date, rocks_context, expires_at
        )
        VALUES (
          ${id}, ${data.organizationId}, ${data.userId}, ${data.slackUserId},
          ${data.slackChannelId}, ${data.workspaceId ?? null}, ${data.reportDate},
          ${rocksContextJson}::jsonb, ${expiresAt.toISOString()}::timestamptz
        )
        RETURNING *
      `

      return parseConversation(rows[0])
    },

    async updateState(
      id: string,
      state: string,
      data?: {
        collectedText?: string
        parsedReport?: Record<string, unknown>
        messageTs?: string
      }
    ): Promise<void> {
      const parsedReportJson = data?.parsedReport ? JSON.stringify(data.parsedReport) : null

      await sql`
        UPDATE slack_conversations
        SET state = ${state},
            collected_text = COALESCE(${data?.collectedText ?? null}, collected_text),
            parsed_report = COALESCE(${parsedReportJson}::jsonb, parsed_report),
            message_ts = COALESCE(${data?.messageTs ?? null}, message_ts),
            updated_at = NOW()
        WHERE id = ${id}
      `
    },

    async expireOld(): Promise<number> {
      const { rowCount } = await sql`
        UPDATE slack_conversations
        SET state = 'expired',
            updated_at = NOW()
        WHERE expires_at < NOW()
          AND state NOT IN ('submitted', 'cancelled', 'expired')
      `
      return rowCount ?? 0
    },

    async findActiveByOrgAndDate(orgId: string, reportDate: string): Promise<SlackConversation[]> {
      const { rows } = await sql`
        SELECT * FROM slack_conversations
        WHERE organization_id = ${orgId}
          AND report_date = ${reportDate}
          AND state NOT IN ('submitted', 'cancelled', 'expired')
      `
      return rows.map(parseConversation)
    },

    async deleteByOrgId(orgId: string): Promise<void> {
      await sql`
        DELETE FROM slack_conversations
        WHERE organization_id = ${orgId}
      `
    },
  },
}

export default slackDb
