import { query } from '../../database/connection';
import type { OutletDbRow } from './publicOutlet.types';

export async function findActivePublicOutlets(): Promise<OutletDbRow[]> {
  const { rows } = await query<OutletDbRow>(
    `SELECT id, business_id, name, slug, address, phone, operating_hours,
            is_active, is_ordering_enabled, customer_auth_mode,
            require_customer_phone, require_customer_name,
            payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
            estimated_prep_time_minutes, created_at, updated_at
     FROM outlets
     WHERE is_active = true
     ORDER BY name ASC`,
  );
  return rows;
}

export async function findOutletBySlug(slug: string): Promise<OutletDbRow | null> {
  const { rows } = await query<OutletDbRow>(
    `SELECT id, business_id, name, slug, address, phone, operating_hours,
            is_active, is_ordering_enabled, customer_auth_mode,
            require_customer_phone, require_customer_name,
            payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
            estimated_prep_time_minutes, created_at, updated_at
     FROM outlets
     WHERE slug = $1 AND is_active = true`,
    [slug],
  );
  return rows[0] ?? null;
}

export async function recordQrScanIfValid(
  outletId: string,
  qrToken: string,
): Promise<'VALID' | 'INVALID_OR_DISABLED'> {
  const { rows } = await query<{ id: string; is_active: boolean }>(
    `SELECT id, is_active
     FROM outlet_qr_codes
     WHERE outlet_id = $1 AND qr_token = $2`,
    [outletId, qrToken],
  );

  const qrRow = rows[0];
  if (!qrRow || !qrRow.is_active) {
    return 'INVALID_OR_DISABLED';
  }

  await query(
    `UPDATE outlet_qr_codes
     SET scans_count = scans_count + 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [qrRow.id],
  );

  return 'VALID';
}
