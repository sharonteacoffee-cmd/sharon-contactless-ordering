import { z } from 'zod';
import './app.config';

const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .trim()
    .min(1, 'DATABASE_URL is required')
    .refine(
      (val) => val.startsWith('postgres://') || val.startsWith('postgresql://'),
      'DATABASE_URL must be a valid PostgreSQL connection URI',
    ),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(20),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(5000),
});

const parsed = databaseEnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[config:database] Invalid database configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid database environment configuration');
}

export const databaseConfig = {
  databaseUrl: parsed.data.DATABASE_URL,
  poolMax: parsed.data.DB_POOL_MAX,
  idleTimeoutMs: parsed.data.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMs: parsed.data.DB_CONNECTION_TIMEOUT_MS,
} as const;
