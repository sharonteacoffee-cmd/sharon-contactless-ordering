import argon2 from 'argon2';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { toUTCISOString, type StaffLoginInput, type StaffRole } from '@sharon/shared';
import { authConfig } from '../../config/auth.config';
import { AppError } from '../../utils/appError';
import {
  findStaffUserByEmail,
  findStaffUserById,
  type StaffUserDbRow,
} from './auth.repository';

export interface StaffProfileDto {
  userId: string;
  businessId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  outletId: string | null;
  outletBusinessId: string | null;
  outletName: string | null;
  outletSlug: string | null;
  createdAt: string;
}

function toStaffProfileDto(row: StaffUserDbRow): StaffProfileDto {
  return {
    userId: row.id,
    businessId: row.business_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    outletId: row.outlet_id,
    outletBusinessId: row.outlet_business_id,
    outletName: row.outlet_name,
    outletSlug: row.outlet_slug,
    createdAt: toUTCISOString(row.created_at),
  };
}

export async function loginStaffUser(
  input: StaffLoginInput,
): Promise<{ accessToken: string; user: StaffProfileDto }> {
  const userRow = await findStaffUserByEmail(input.email);
  if (!userRow || !userRow.is_active) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const passwordValid = await argon2.verify(userRow.password_hash, input.password);
  if (!passwordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const user = toStaffProfileDto(userRow);
  const signOptions: SignOptions = {
    algorithm: 'HS256',
    expiresIn: authConfig.jwtExpiresIn as SignOptions['expiresIn'],
  };

  const accessToken = jwt.sign(
    {
      userId: user.userId,
      businessId: user.businessId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      outletId: user.outletId,
      outletBusinessId: user.outletBusinessId,
    },
    authConfig.jwtSecret,
    signOptions,
  );

  return { accessToken, user };
}

export async function getStaffProfileById(userId: string): Promise<StaffProfileDto> {
  const userRow = await findStaffUserById(userId);
  if (!userRow || !userRow.is_active) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Staff profile not found.');
  }
  return toStaffProfileDto(userRow);
}
