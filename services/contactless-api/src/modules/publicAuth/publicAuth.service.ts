import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { appConfig } from '../../config/app.config';
import { authConfig } from '../../config/auth.config';
import { AppError } from '../../utils/appError';
import { findOutletBySlug } from '../publicOutlet/publicOutlet.repository';

interface OtpChallengeRecord {
  otpHash: string;
  expiresAtMs: number;
  attempts: number;
}

interface CustomerOtpTokenPayload {
  purpose: 'CUSTOMER_OTP_VERIFIED';
  outletSlug: string;
  customerPhone: string;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const otpStore = new Map<string, OtpChallengeRecord>();

function buildOtpKey(outletSlug: string, customerPhone: string): string {
  return `${outletSlug.toLowerCase()}:${customerPhone}`;
}

function hashOtp(outletSlug: string, customerPhone: string, otpCode: string): string {
  return crypto
    .createHmac('sha256', authConfig.jwtSecret)
    .update(`${outletSlug.toLowerCase()}:${customerPhone}:${otpCode}`)
    .digest('hex');
}

function pruneExpiredOtps(): void {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (record.expiresAtMs <= now) {
      otpStore.delete(key);
    }
  }
}

export async function sendCustomerOtp(input: {
  outletSlug: string;
  customerPhone: string;
}): Promise<{ expiresInSeconds: number; devOtpPreview?: string }> {
  const outlet = await findOutletBySlug(input.outletSlug);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }

  if (outlet.customer_auth_mode !== 'OTP_VERIFIED') {
    throw new AppError(
      400,
      'OTP_NOT_REQUIRED',
      'OTP verification is not enabled for this outlet.',
    );
  }

  pruneExpiredOtps();
  const otpCode = String(crypto.randomInt(100000, 1000000));
  const key = buildOtpKey(input.outletSlug, input.customerPhone);

  otpStore.set(key, {
    otpHash: hashOtp(input.outletSlug, input.customerPhone, otpCode),
    expiresAtMs: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  if (appConfig.isDevelopment) {
    console.log(
      `[publicAuth] Dev OTP for ${input.outletSlug} (${input.customerPhone}): ${otpCode}`,
    );
  }

  return {
    expiresInSeconds: OTP_TTL_MS / 1000,
    ...(appConfig.isDevelopment ? { devOtpPreview: otpCode } : {}),
  };
}

export async function verifyCustomerOtp(input: {
  outletSlug: string;
  customerPhone: string;
  otpCode: string;
}): Promise<{ otpVerificationToken: string; expiresInSeconds: number }> {
  const key = buildOtpKey(input.outletSlug, input.customerPhone);
  const record = otpStore.get(key);

  if (!record || record.expiresAtMs <= Date.now()) {
    otpStore.delete(key);
    throw new AppError(401, 'OTP_EXPIRED_OR_NOT_FOUND', 'OTP expired or not requested.');
  }

  record.attempts += 1;
  if (record.attempts > MAX_OTP_ATTEMPTS) {
    otpStore.delete(key);
    throw new AppError(
      429,
      'OTP_MAX_ATTEMPTS',
      'Maximum OTP attempts exceeded. Please request a new OTP.',
    );
  }

  const candidateHash = hashOtp(input.outletSlug, input.customerPhone, input.otpCode);
  const expectedBuf = Buffer.from(record.otpHash, 'utf8');
  const candidateBuf = Buffer.from(candidateHash, 'utf8');

  if (
    expectedBuf.length !== candidateBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, candidateBuf)
  ) {
    throw new AppError(401, 'INVALID_OTP', 'Invalid verification code.');
  }

  otpStore.delete(key);

  const payload: CustomerOtpTokenPayload = {
    purpose: 'CUSTOMER_OTP_VERIFIED',
    outletSlug: input.outletSlug,
    customerPhone: input.customerPhone,
  };

  const otpVerificationToken = jwt.sign(payload, authConfig.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: authConfig.otpTokenTtlSeconds,
  });

  return {
    otpVerificationToken,
    expiresInSeconds: authConfig.otpTokenTtlSeconds,
  };
}

export function verifyCustomerOtpToken(
  token: string,
  expectedOutletSlug: string,
  expectedPhone: string,
): void {
  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret, {
      algorithms: ['HS256'],
    }) as CustomerOtpTokenPayload;

    if (
      decoded.purpose !== 'CUSTOMER_OTP_VERIFIED' ||
      decoded.outletSlug !== expectedOutletSlug ||
      decoded.customerPhone !== expectedPhone
    ) {
      throw new AppError(401, 'OTP_VERIFICATION_INVALID', 'OTP session does not match phone or outlet.');
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(401, 'OTP_VERIFICATION_REQUIRED', 'Valid OTP verification is required for this outlet.');
  }
}
