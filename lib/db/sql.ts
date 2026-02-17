/**
 * Database SQL adapter that works with both:
 * - @vercel/postgres (production on Vercel)
 * - pg (local development)
 *
 * This allows local development without Vercel Postgres
 */

import { sql as vercelSql, QueryResult, QueryResultRow, VercelPoolClient } from "@vercel/postgres"
import { Pool, PoolClient, QueryResult as PgQueryResult } from "pg"

// Detect if we should use local postgres
const isLocal = process.env.NODE_ENV === "development" && !process.env.VERCEL

// Create local pool only when needed
let localPool: Pool | null = null

function getLocalPool(): Pool {
  if (!localPool) {
    localPool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  }
  return localPool
}

// Convert pg result to @vercel/postgres compatible format
function convertResult<T extends QueryResultRow>(result: PgQueryResult): QueryResult<T> {
  return {
    rows: result.rows as T[],
    fields: result.fields,
    rowCount: result.rowCount ?? 0,
    command: result.command ?? "",
    oid: result.oid ?? 0,
    rowAsArray: false,
    vipianoConnection: undefined,
  } as QueryResult<T>
}

// Template literal tag function for queries
function createSqlFunction(client?: PoolClient) {
  return async function localSql<T extends QueryResultRow = QueryResultRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>> {
    const queryClient = client || getLocalPool()

    // Build the query with numbered parameters ($1, $2, etc.)
    let query = ""
    strings.forEach((string, i) => {
      query += string
      if (i < values.length) {
        query += `$${i + 1}`
      }
    })

    const result = await queryClient.query(query, values)
    return convertResult<T>(result)
  }
}

// Local pool client wrapper to match VercelPoolClient interface
export class LocalPoolClient {
  private client: PoolClient
  sql: ReturnType<typeof createSqlFunction>

  constructor(client: PoolClient) {
    this.client = client
    this.sql = createSqlFunction(client)
  }

  // Standard query method for transactions
  async query<T extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[]
  ): Promise<QueryResult<T>> {
    const result = await this.client.query(queryText, values)
    return convertResult<T>(result)
  }

  release() {
    this.client.release()
  }
}

// Create the sql object with connect and query methods for local development
interface LocalSql {
  <T extends QueryResultRow = QueryResultRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<QueryResult<T>>
  connect(): Promise<LocalPoolClient>
  query<T extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[]
  ): Promise<QueryResult<T>>
}

const localSqlWithConnect = createSqlFunction() as LocalSql

localSqlWithConnect.connect = async () => {
  const pool = getLocalPool()
  const client = await pool.connect()
  return new LocalPoolClient(client)
}

localSqlWithConnect.query = async <T extends QueryResultRow = QueryResultRow>(
  queryText: string,
  values?: unknown[]
): Promise<QueryResult<T>> => {
  const pool = getLocalPool()
  const result = await pool.query(queryText, values)
  return convertResult<T>(result)
}

// Export the appropriate sql function based on environment
export const sql = isLocal ? localSqlWithConnect : vercelSql

// Re-export types
export type { QueryResult, QueryResultRow, VercelPoolClient }

// Export a cleanup function for local pool
export async function closePool(): Promise<void> {
  if (localPool) {
    await localPool.end()
    localPool = null
  }
}
