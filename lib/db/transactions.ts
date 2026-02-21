/**
 * Database Transaction Support
 *
 * Provides transaction management for complex operations that need
 * atomicity. Uses Vercel Postgres's transaction support.
 */

import { sql, VercelPoolClient, LocalPoolClient } from "./sql"

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
