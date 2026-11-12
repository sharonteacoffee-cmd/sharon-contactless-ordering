import { z } from 'zod';
import './app.config';

const authEnvSchema = z.object({
  JWT_SECRET: z
    .string()
    .trim()
    .min(32, 'JWT_SECRET must be at least 32 characters for HS256 security'),
  JWT_EXPIRES_IN: z.string().trim().min(1).default('12h'),
  OTP_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
});

const parsed = authEnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[config:auth] Invalid auth configuration:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid auth environment configuration');
}

export const authConfig = {
  jwtSecret: parsed.data.JWT_SECRET,
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  otpTokenTtlSeconds: parsed.data.OTP_TOKEN_TTL_SECONDS,
} as const;
