import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load workspace root .env first, then service-local .env if present
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const appEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  CORS_ALLOWED_ORIGINS: z.string().optional().default(''),
  ORDER_APP_URL: z.string().url().optional(),
});

const parsed = appEnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[config:app] Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid application environment configuration');
}

const rawOrigins = parsed.data.CORS_ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

const defaultProdOrigins = [
  'https://order.sharonteastall.com',
  'https://dashboard.sharonteastall.com',
];

const allowedOrigins =
  rawOrigins.length > 0
    ? rawOrigins
    : parsed.data.NODE_ENV === 'production'
      ? defaultProdOrigins
      : defaultDevOrigins;

export const appConfig = {
  nodeEnv: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  port: parsed.data.PORT,
  corsAllowedOrigins: allowedOrigins,
  orderAppUrl:
    parsed.data.ORDER_APP_URL ??
    (parsed.data.NODE_ENV === 'production'
      ? 'https://order.sharonteastall.com'
      : 'http://localhost:5173'),
} as const;
