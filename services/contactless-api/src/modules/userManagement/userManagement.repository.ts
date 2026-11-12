import type { PoolClient } from 'pg';
import type { StaffRole } from '@sharon/shared';
import { query } from '../../database/connection';

export interface ManagedUserDbRow {
  id: string;
  business_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  outlet_id: string | null;
  outlet_business_id: string | null;
  outlet_name: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export async function findAllManagedUsers(): Promise<ManagedUserDbRow[]> {
  const { rows } = await query<ManagedUserDbRow>(
    `SELECT u.id, u.business_id, u.email, u.full_name, u.role,
            u.outlet_id, o.business_id AS outlet_business_id, o.name AS outlet_name,
            u.is_active, u.created_at, u.updated_at
     FROM users u
     LEFT JOIN outlets o ON o.id = u.outlet_id
     WHERE LOWER(u.email) NOT LIKE '%@novacodex.in'
     ORDER BY u.created_at DESC`,
  );
  return rows;
}

export async function findUserByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  const { rows } = await query<{ id: string; email: string }>(
    'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
    [email],
  );
  return rows[0] ?? null;
}

export async function findManagedUserByBusinessId(
  userBusinessId: string,
): Promise<ManagedUserDbRow | null> {
  const { rows } = await query<ManagedUserDbRow>(
    `SELECT u.id, u.business_id, u.email, u.full_name, u.role,
            u.outlet_id, o.business_id AS outlet_business_id, o.name AS outlet_name,
            u.is_active, u.created_at, u.updated_at
     FROM users u
     LEFT JOIN outlets o ON o.id = u.outlet_id
     WHERE u.business_id = $1
       AND LOWER(u.email) NOT LIKE '%@novacodex.in'`,
    [userBusinessId],
  );
  return rows[0] ?? null;
}

export async function insertManagedUser(
  client: PoolClient,
  params: {
    businessId: string;
    email: string;
    passwordHash: string;
    fullName: string;
    role: StaffRole;
    outletId: string | null;
    isActive: boolean;
  },
): Promise<{ id: string; created_at: Date; updated_at: Date }> {
  const { rows } = await client.query<{ id: string; created_at: Date; updated_at: Date }>(
    `INSERT INTO users (business_id, email, password_hash, full_name, role, outlet_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, created_at, updated_at`,
    [
      params.businessId,
      params.email,
      params.passwordHash,
      params.fullName,
      params.role,
      params.outletId,
      params.isActive,
    ],
  );
  return rows[0];
}

export async function updateManagedUserRow(params: {
  userId: string;
  fullName: string;
  role: StaffRole;
  outletId: string | null;
  isActive: boolean;
  passwordHash?: string;
}): Promise<{ updated_at: Date }> {
  const { rows } = await query<{ updated_at: Date }>(
    `UPDATE users
     SET full_name = $2,
         role = $3,
         outlet_id = $4,
         is_active = $5,
         password_hash = COALESCE($6, password_hash),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING updated_at`,
    [
      params.userId,
      params.fullName,
      params.role,
      params.outletId,
      params.isActive,
      params.passwordHash ?? null,
    ],
  );
  return rows[0];
}

export async function toggleManagedUserStatusRow(params: {
  userId: string;
  isActive: boolean;
}): Promise<{ updated_at: Date }> {
  const { rows } = await query<{ updated_at: Date }>(
    `UPDATE users
     SET is_active = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING updated_at`,
    [params.userId, params.isActive],
  );
  return rows[0];
}
