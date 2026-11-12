import type { StaffRole } from '@sharon/shared';
import { query } from '../../database/connection';

export interface StaffUserDbRow {
  id: string;
  business_id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: StaffRole;
  outlet_id: string | null;
  outlet_business_id: string | null;
  outlet_name: string | null;
  outlet_slug: string | null;
  is_active: boolean;
  created_at: Date;
}

export async function findStaffUserByEmail(
  email: string,
): Promise<StaffUserDbRow | null> {
  const { rows } = await query<StaffUserDbRow>(
    `SELECT u.id, u.business_id, u.email, u.password_hash, u.full_name, u.role,
            u.outlet_id, o.business_id AS outlet_business_id,
            o.name AS outlet_name, o.slug AS outlet_slug,
            u.is_active, u.created_at
     FROM users u
     LEFT JOIN outlets o ON o.id = u.outlet_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findStaffUserById(
  userId: string,
): Promise<StaffUserDbRow | null> {
  const { rows } = await query<StaffUserDbRow>(
    `SELECT u.id, u.business_id, u.email, u.password_hash, u.full_name, u.role,
            u.outlet_id, o.business_id AS outlet_business_id,
            o.name AS outlet_name, o.slug AS outlet_slug,
            u.is_active, u.created_at
     FROM users u
     LEFT JOIN outlets o ON o.id = u.outlet_id
     WHERE u.id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}
