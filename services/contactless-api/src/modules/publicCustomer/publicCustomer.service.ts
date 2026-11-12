import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type {
  CustomerLoginResult,
  CustomerLookupResult,
  CustomerOrderHistoryItem,
  CustomerProfileDto,
  LookupCustomerByPhoneInput,
  SaveCustomerProfileInput,
  SendCustomerLoginOtpInput,
  SendCustomerLoginOtpResult,
  UpdateCustomerProfileInput,
  VerifyCustomerLoginOtpInput,
} from '@sharon/shared';
import { appConfig } from '../../config/app.config';
import { authConfig } from '../../config/auth.config';
import { generateNextBusinessId } from '../../database/businessIdGenerator';
import { withTransaction } from '../../database/connection';
import type { CustomerSessionJwtPayload } from '../../middleware/authenticateCustomer.middleware';
import { AppError } from '../../utils/appError';
import {
  toCustomerLookupDto,
  toCustomerOrderHistoryItemDto,
  toCustomerProfileDto,
} from './publicCustomer.dto';
import {
  findCustomerById,
  findCustomerByPhone,
  findCustomerOrders,
  updateCustomerFullName,
  upsertCustomerProfile,
} from './publicCustomer.repository';

interface LoginOtpChallenge {
  otpHash: string;
  expiresAtMs: number;
  attempts: number;
}

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const CUSTOMER_SESSION_TTL_SECONDS = 24 * 60 * 60;
const loginOtpStore = new Map<string, LoginOtpChallenge>();

function hashLoginOtp(phone: string, otpCode: string): string {
  return crypto
    .createHmac('sha256', authConfig.jwtSecret)
    .update(`customer-login:${phone}:${otpCode}`)
    .digest('hex');
}

function pruneExpiredLoginOtps(): void {
  const now = Date.now();
  for (const [phone, record] of loginOtpStore.entries()) {
    if (record.expiresAtMs <= now) {
      loginOtpStore.delete(phone);
    }
  }
}

export async function lookupCustomerByPhone(
  input: LookupCustomerByPhoneInput,
): Promise<CustomerLookupResult> {
  const row = await findCustomerByPhone(input.phone);
  return toCustomerLookupDto(row);
}

export async function saveCustomerProfile(
  input: SaveCustomerProfileInput,
): Promise<CustomerProfileDto> {
  const saved = await withTransaction(async (client) => {
    const businessId = await generateNextBusinessId(client, 'CUS');
    return upsertCustomerProfile(client, {
      businessId,
      fullName: input.fullName.trim(),
      phone: input.phone,
    });
  });

  return toCustomerProfileDto(saved);
}

export async function sendCustomerLoginOtp(
  input: SendCustomerLoginOtpInput,
): Promise<SendCustomerLoginOtpResult> {
  pruneExpiredLoginOtps();
  const otpCode = String(crypto.randomInt(100000, 1000000));

  loginOtpStore.set(input.phone, {
    otpHash: hashLoginOtp(input.phone, otpCode),
    expiresAtMs: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  if (appConfig.isDevelopment) {
    console.log(`[publicCustomer] Dev login OTP for ${input.phone}: ${otpCode}`);
  }

  return {
    expiresInSeconds: OTP_TTL_MS / 1000,
    ...(appConfig.isDevelopment ? { devOtpPreview: otpCode } : {}),
  };
}

export async function verifyCustomerLoginOtp(
  input: VerifyCustomerLoginOtpInput,
): Promise<CustomerLoginResult> {
  const record = loginOtpStore.get(input.phone);
  if (!record || record.expiresAtMs <= Date.now()) {
    loginOtpStore.delete(input.phone);
    throw new AppError(401, 'OTP_EXPIRED_OR_NOT_FOUND', 'OTP expired or not requested.');
  }

  record.attempts += 1;
  if (record.attempts > MAX_OTP_ATTEMPTS) {
    loginOtpStore.delete(input.phone);
    throw new AppError(
      429,
      'OTP_MAX_ATTEMPTS',
      'Maximum OTP attempts exceeded. Please request a new OTP.',
    );
  }

  const candidateHash = hashLoginOtp(input.phone, input.otpCode);
  const expectedBuf = Buffer.from(record.otpHash, 'utf8');
  const candidateBuf = Buffer.from(candidateHash, 'utf8');

  if (
    expectedBuf.length !== candidateBuf.length ||
    !crypto.timingSafeEqual(expectedBuf, candidateBuf)
  ) {
    throw new AppError(401, 'INVALID_OTP', 'Invalid verification code.');
  }

  const customerRow = await withTransaction(async (client) => {
    const existing = await findCustomerByPhone(input.phone, client);
    if (!existing) {
      if (!input.fullName?.trim()) {
        throw new AppError(
          422,
          'VALIDATION_ERROR',
          'Full name is required to create your profile.',
          [{ field: 'fullName', message: 'Full name is required to create your profile' }],
        );
      }
      const businessId = await generateNextBusinessId(client, 'CUS');
      return upsertCustomerProfile(client, {
        businessId,
        fullName: input.fullName.trim(),
        phone: input.phone,
      });
    }

    if (input.fullName?.trim()) {
      const updated = await updateCustomerFullName(
        existing.id,
        input.fullName.trim(),
        client,
      );
      return updated ?? existing;
    }

    return existing;
  });

  // Delete OTP only after customer creation/lookup succeeds (so missing fullName doesn't burn the OTP)
  loginOtpStore.delete(input.phone);

  const jwtPayload: CustomerSessionJwtPayload = {
    purpose: 'CUSTOMER_SESSION',
    customerId: customerRow.id,
    customerBusinessId: customerRow.business_id,
    phone: customerRow.phone,
  };

  const customerAccessToken = jwt.sign(jwtPayload, authConfig.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: CUSTOMER_SESSION_TTL_SECONDS,
  });

  return {
    customerAccessToken,
    expiresInSeconds: CUSTOMER_SESSION_TTL_SECONDS,
    customer: toCustomerProfileDto(customerRow),
  };
}

export async function getMyCustomerProfile(
  customerId: string,
): Promise<CustomerProfileDto> {
  const row = await findCustomerById(customerId);
  if (!row) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer profile not found.');
  }
  return toCustomerProfileDto(row);
}

export async function updateMyCustomerProfile(
  customerId: string,
  input: UpdateCustomerProfileInput,
): Promise<CustomerProfileDto> {
  const updated = await updateCustomerFullName(customerId, input.fullName.trim());
  if (!updated) {
    throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer profile not found.');
  }
  return toCustomerProfileDto(updated);
}

export async function getMyCustomerOrders(
  customerId: string,
  phone: string,
): Promise<CustomerOrderHistoryItem[]> {
  const rows = await findCustomerOrders(customerId, phone);
  return rows.map(toCustomerOrderHistoryItemDto);
}
