import argon2 from 'argon2';
import {
  toUTCISOString,
  type CreateUserInput,
  type ManagedUserRecord,
  type ToggleUserStatusInput,
  type UpdateUserInput,
} from '@sharon/shared';
import { generateNextBusinessId } from '../../database/businessIdGenerator';
import { withTransaction } from '../../database/connection';
import type { AuthenticatedStaffUser } from '../../types/auth.types';
import { AppError } from '../../utils/appError';
import { findOutletByBusinessId } from '../outletStock/outletStock.repository';
import {
  findAllManagedUsers,
  findManagedUserByBusinessId,
  findUserByEmail,
  insertManagedUser,
  toggleManagedUserStatusRow,
  updateManagedUserRow,
  type ManagedUserDbRow,
} from './userManagement.repository';

function isHiddenInternalEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@novacodex.in');
}

function toManagedUserDto(row: ManagedUserDbRow): ManagedUserRecord {
  return {
    businessId: row.business_id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    outletBusinessId: row.outlet_business_id,
    outletName: row.outlet_name,
    isActive: row.is_active,
    createdAt: toUTCISOString(row.created_at),
    updatedAt: toUTCISOString(row.updated_at),
  };
}

export async function getManagedUsers(): Promise<ManagedUserRecord[]> {
  const rows = await findAllManagedUsers();
  return rows
    .filter((row) => !isHiddenInternalEmail(row.email))
    .map(toManagedUserDto);
}

export async function createManagedUser(
  input: CreateUserInput,
): Promise<ManagedUserRecord> {
  const normalizedEmail = input.email.trim().toLowerCase();
  if (isHiddenInternalEmail(normalizedEmail)) {
    throw new AppError(
      403,
      'FORBIDDEN_RESERVED_DOMAIN',
      'Accounts on this reserved domain cannot be created through user management.',
    );
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw new AppError(
      409,
      'EMAIL_ALREADY_EXISTS',
      'A user with this email address already exists.',
    );
  }

  let outletId: string | null = null;
  let outletBusinessId: string | null = null;
  let outletName: string | null = null;

  if (input.outletBusinessId) {
    const outlet = await findOutletByBusinessId(input.outletBusinessId);
    if (!outlet) {
      throw new AppError(404, 'OUTLET_NOT_FOUND', 'Assigned outlet not found.');
    }
    outletId = outlet.id;
    outletBusinessId = outlet.business_id;
    outletName = outlet.name;
  } else if (input.role === 'OUTLET_STAFF') {
    throw new AppError(422, 'VALIDATION_ERROR', 'Outlet is required for outlet staff.', [
      { field: 'outletBusinessId', message: 'Outlet is required for outlet staff' },
    ]);
  }

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

  const created = await withTransaction(async (client) => {
    const businessId = await generateNextBusinessId(client, 'USR');
    const inserted = await insertManagedUser(client, {
      businessId,
      email: normalizedEmail,
      passwordHash,
      fullName: input.fullName.trim(),
      role: input.role,
      outletId,
      isActive: input.isActive,
    });
    return { businessId, inserted };
  });

  return {
    businessId: created.businessId,
    email: normalizedEmail,
    fullName: input.fullName.trim(),
    role: input.role,
    outletBusinessId,
    outletName,
    isActive: input.isActive,
    createdAt: toUTCISOString(created.inserted.created_at),
    updatedAt: toUTCISOString(created.inserted.updated_at),
  };
}

export async function updateManagedUser(
  currentUser: AuthenticatedStaffUser,
  userBusinessId: string,
  input: UpdateUserInput,
): Promise<ManagedUserRecord> {
  const existing = await findManagedUserByBusinessId(userBusinessId);
  if (!existing || isHiddenInternalEmail(existing.email)) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  if (existing.id === currentUser.userId && input.isActive === false) {
    throw new AppError(
      409,
      'CANNOT_DISABLE_SELF',
      'You cannot disable your own active MD account.',
    );
  }

  const nextRole = input.role ?? existing.role;
  const nextFullName = input.fullName?.trim() ?? existing.full_name;
  const nextIsActive = input.isActive ?? existing.is_active;

  let nextOutletId = existing.outlet_id;
  let nextOutletBusinessId = existing.outlet_business_id;
  let nextOutletName = existing.outlet_name;

  if (input.outletBusinessId !== undefined) {
    if (input.outletBusinessId === null) {
      nextOutletId = null;
      nextOutletBusinessId = null;
      nextOutletName = null;
    } else {
      const outlet = await findOutletByBusinessId(input.outletBusinessId);
      if (!outlet) {
        throw new AppError(404, 'OUTLET_NOT_FOUND', 'Assigned outlet not found.');
      }
      nextOutletId = outlet.id;
      nextOutletBusinessId = outlet.business_id;
      nextOutletName = outlet.name;
    }
  }

  if (nextRole === 'OUTLET_STAFF' && !nextOutletId) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Outlet is required for outlet staff.', [
      { field: 'outletBusinessId', message: 'Outlet is required for outlet staff' },
    ]);
  }

  const passwordHash = input.password
    ? await argon2.hash(input.password, { type: argon2.argon2id })
    : undefined;

  const updated = await updateManagedUserRow({
    userId: existing.id,
    fullName: nextFullName,
    role: nextRole,
    outletId: nextOutletId,
    isActive: nextIsActive,
    passwordHash,
  });

  return {
    businessId: existing.business_id,
    email: existing.email,
    fullName: nextFullName,
    role: nextRole,
    outletBusinessId: nextOutletBusinessId,
    outletName: nextOutletName,
    isActive: nextIsActive,
    createdAt: toUTCISOString(existing.created_at),
    updatedAt: toUTCISOString(updated.updated_at),
  };
}

export async function toggleManagedUserStatus(
  currentUser: AuthenticatedStaffUser,
  userBusinessId: string,
  input: ToggleUserStatusInput,
): Promise<ManagedUserRecord> {
  const existing = await findManagedUserByBusinessId(userBusinessId);
  if (!existing || isHiddenInternalEmail(existing.email)) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  if (existing.id === currentUser.userId && !input.isActive) {
    throw new AppError(
      409,
      'CANNOT_DISABLE_SELF',
      'You cannot disable your own active MD account.',
    );
  }

  const updated = await toggleManagedUserStatusRow({
    userId: existing.id,
    isActive: input.isActive,
  });

  return {
    ...toManagedUserDto(existing),
    isActive: input.isActive,
    updatedAt: toUTCISOString(updated.updated_at),
  };
}
