import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { databaseConfig } from '../config/database.config';

export const dbPool = new Pool({
  connectionString: databaseConfig.databaseUrl,
  max: databaseConfig.poolMax,
  idleTimeoutMillis: databaseConfig.idleTimeoutMs,
  connectionTimeoutMillis: databaseConfig.connectionTimeoutMs,
});

dbPool.on('connect', (client) => {
  // Enforce canonical UTC across every pooled PostgreSQL session
  void client.query("SET TIME ZONE 'UTC'").catch((err) => {
    console.error('[db] Failed to set UTC timezone on connection:', err);
  });
});

dbPool.on('error', (err) => {
  console.error('[db] Unexpected idle client error:', err);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const client = await dbPool.connect();
  try {
    await client.query("SET TIME ZONE 'UTC'");
    return await client.query<T>(text, params);
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await dbPool.connect();
  try {
    await client.query("SET TIME ZONE 'UTC'");
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
