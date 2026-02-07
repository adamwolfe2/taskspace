/**
 * Database Transaction Support
 *
 * Provides transaction management for complex operations that need
 * atomicity. Uses Vercel Postgres's transaction support.
 */

import { sql, VercelPoolClient, LocalPoolClient, QueryResult, QueryResultRow } from "./sql"
import { logger, logError } from "@/lib/logger"

// ============================================
// TRANSACTION TYPES
// ============================================

export type PoolClient = VercelPoolClient | LocalPoolClient

export interface TransactionContext {
  client: PoolClient
  committed: boolean
  rolledBack: boolean
}

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>

// ============================================
// TRANSACTION UTILITIES
// ============================================

/**
 * Execute a function within a database transaction
 *
 * @example
 * const result = await withTransaction(async (client) => {
 *   await client.sql`INSERT INTO users (name) VALUES ('John')`
 *   await client.sql`INSERT INTO profiles (user_id) VALUES (${userId})`
 *   return { success: true }
 * })
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
  options: {
    isolationLevel?: "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE"
    timeout?: number
  } = {}
): Promise<T> {
  const client = await sql.connect()

  try {
    // Set isolation level if specified
    // Note: isolation levels must be set as literal SQL, not parameterized
    if (options.isolationLevel === "READ COMMITTED") {
      await client.sql`SET TRANSACTION ISOLATION LEVEL READ COMMITTED`
    } else if (options.isolationLevel === "REPEATABLE READ") {
      await client.sql`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ`
    } else if (options.isolationLevel === "SERIALIZABLE") {
      await client.sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
    }

    // Set timeout if specified
    if (options.timeout) {
      await client.sql`SET statement_timeout = ${options.timeout}`
    }

    // Begin transaction
    await client.sql`BEGIN`

    // Execute the callback
    const result = await callback(client)

    // Commit transaction
    await client.sql`COMMIT`

    return result
  } catch (error) {
    // Rollback on error
    await client.sql`ROLLBACK`
    throw error
  } finally {
    // Always release the client
    client.release()
  }
}

/**
 * Execute multiple operations in a transaction with automatic retry on serialization failure
 */
export async function withRetryTransaction<T>(
  callback: TransactionCallback<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(callback, {
        isolationLevel: "SERIALIZABLE",
      })
    } catch (error) {
      lastError = error as Error

      // Check if it's a serialization failure (can be retried)
      if (
        error instanceof Error &&
        (error.message.includes("could not serialize") ||
          error.message.includes("deadlock detected"))
      ) {
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100)
          )
          continue
        }
      }

      // Non-retryable error or max retries reached
      throw error
    }
  }

  throw lastError || new Error("Transaction failed after max retries")
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Batch insert multiple records efficiently
 */
export async function batchInsert<T extends Record<string, unknown>>(
  tableName: string,
  records: T[],
  options: {
    batchSize?: number
    onConflict?: "ignore" | "update" | "error"
    conflictColumns?: string[]
    updateColumns?: string[]
  } = {}
): Promise<{ inserted: number; skipped: number }> {
  if (records.length === 0) {
    return { inserted: 0, skipped: 0 }
  }

  const batchSize = options.batchSize || 100
  const columns = Object.keys(records[0])
  let inserted = 0
  let skipped = 0

  // Process in batches
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize)

    // Build values clause
    const values = batch.map((record, index) => {
      const placeholders = columns.map(
        (_, colIndex) => `$${index * columns.length + colIndex + 1}`
      )
      return `(${placeholders.join(", ")})`
    })

    // Flatten values for parameterized query
    const flatValues = batch.flatMap((record) =>
      columns.map((col) => record[col])
    )

    // Build ON CONFLICT clause
    let conflictClause = ""
    if (options.onConflict === "ignore") {
      conflictClause = "ON CONFLICT DO NOTHING"
    } else if (options.onConflict === "update" && options.conflictColumns) {
      const updateCols = options.updateColumns || columns.filter(
        (c) => !options.conflictColumns!.includes(c)
      )
      conflictClause = `ON CONFLICT (${options.conflictColumns.join(", ")}) DO UPDATE SET ${updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(", ")}`
    }

    // Execute batch insert
    const query = `
      INSERT INTO ${tableName} (${columns.join(", ")})
      VALUES ${values.join(", ")}
      ${conflictClause}
    `

    try {
      const result = await (sql.query as (query: string, values: unknown[]) => Promise<QueryResult<QueryResultRow>>)(query, flatValues)
      inserted += result.rowCount || 0
      if (options.onConflict === "ignore") {
        skipped += batch.length - (result.rowCount || 0)
      }
    } catch (error) {
      logError(logger, `Batch insert error for ${tableName}`, error)
      throw error
    }
  }

  return { inserted, skipped }
}

/**
 * Batch update multiple records efficiently
 */
export async function batchUpdate<T extends Record<string, unknown>>(
  tableName: string,
  updates: Array<{ id: string; data: Partial<T> }>,
  options: { batchSize?: number } = {}
): Promise<number> {
  if (updates.length === 0) return 0

  const batchSize = options.batchSize || 50
  let updated = 0

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)

    // Use a transaction for batch updates
    await withTransaction(async (client) => {
      for (const { id, data } of batch) {
        const columns = Object.keys(data)
        const values = Object.values(data)

        if (columns.length === 0) continue

        const setClauses = columns.map((col, idx) => `${col} = $${idx + 2}`)

        const query = `
          UPDATE ${tableName}
          SET ${setClauses.join(", ")}, updated_at = NOW()
          WHERE id = $1
        `

        const result = await (client.query as (query: string, values: unknown[]) => Promise<QueryResult<QueryResultRow>>)(query, [id, ...values])
        updated += result.rowCount || 0
      }
    })
  }

  return updated
}

/**
 * Batch delete multiple records efficiently
 */
export async function batchDelete(
  tableName: string,
  ids: string[],
  options: { batchSize?: number } = {}
): Promise<number> {
  if (ids.length === 0) return 0

  const batchSize = options.batchSize || 100
  let deleted = 0

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)

    const placeholders = batch.map((_, idx) => `$${idx + 1}`)
    const query = `DELETE FROM ${tableName} WHERE id IN (${placeholders.join(", ")})`

    const result = await (sql.query as (query: string, values: unknown[]) => Promise<QueryResult<QueryResultRow>>)(query, batch)
    deleted += result.rowCount || 0
  }

  return deleted
}

// ============================================
// QUERY BUILDERS
// ============================================

/**
 * Build ORDER BY clause from sort parameters
 */
export function buildOrderByClause(
  sortBy?: string,
  sortOrder: "asc" | "desc" = "desc",
  allowedColumns: string[] = []
): string {
  if (!sortBy) return "ORDER BY created_at DESC"

  // Validate column name to prevent SQL injection
  const safeColumn = allowedColumns.includes(sortBy) ? sortBy : "created_at"
  const safeOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC"

  return `ORDER BY ${safeColumn} ${safeOrder}`
}

/**
 * Build LIMIT and OFFSET clause
 */
export function buildPaginationClause(
  page: number,
  pageSize: number
): { clause: string; limit: number; offset: number } {
  const limit = Math.min(Math.max(1, pageSize), 100)
  const offset = (Math.max(1, page) - 1) * limit

  return {
    clause: `LIMIT ${limit} OFFSET ${offset}`,
    limit,
    offset,
  }
}
