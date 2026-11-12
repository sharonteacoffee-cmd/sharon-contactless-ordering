import fs from 'node:fs';
import path from 'node:path';
import { dbPool } from './connection';

async function runSchemaInit(): Promise<void> {
  const modeArg = process.argv[2] ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
  const fileName = modeArg === 'production' ? 'schema.production.sql' : 'schema.development.sql';
  const sqlPath = path.resolve(__dirname, fileName);

  if (!fs.existsSync(sqlPath)) {
    throw new Error(`Schema file not found: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf-8');
  const client = await dbPool.connect();
  try {
    await client.query("SET TIME ZONE 'UTC'");
    await client.query(sql);
    console.log(`[db:init] Applied ${fileName} successfully in UTC mode.`);
  } finally {
    client.release();
    await dbPool.end();
  }
}

runSchemaInit().catch((err) => {
  console.error('[db:init] Failed:', err);
  process.exit(1);
});
