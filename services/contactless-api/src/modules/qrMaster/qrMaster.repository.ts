import type { PoolClient } from 'pg';
import { query } from '../../database/connection';

export interface QrCodeJoinedRow {
  id: string;
  business_id: string;
  outlet_id: string;
  outlet_business_id: string;
  outlet_name: string;
  outlet_slug: string;
  qr_token: string;
  label: string;
  is_active: boolean;
  scans_count: number;
  created_at: Date;
  updated_at: Date;
}

export async function findAllQrCodes(
  outletBusinessId?: string,
): Promise<QrCodeJoinedRow[]> {
  const params: unknown[] = [];
  const filter = outletBusinessId ? 'WHERE out.business_id = $1' : '';
  if (outletBusinessId) {
    params.push(outletBusinessId);
  }

  const { rows } = await query<QrCodeJoinedRow>(
    `SELECT qr.id, qr.business_id, qr.outlet_id,
            out.business_id AS outlet_business_id, out.name AS outlet_name, out.slug AS outlet_slug,
            qr.qr_token, qr.label, qr.is_active, qr.scans_count, qr.created_at, qr.updated_at
     FROM outlet_qr_codes qr
     INNER JOIN outlets out ON out.id = qr.outlet_id
     ${filter}
     ORDER BY qr.created_at DESC`,
    params,
  );
  return rows;
}

export async function insertQrCode(
  client: PoolClient,
  params: {
    businessId: string;
    outletId: string;
    qrToken: string;
    label: string;
  },
): Promise<{ id: string; created_at: Date; updated_at: Date }> {
  const { rows } = await client.query<{ id: string; created_at: Date; updated_at: Date }>(
    `INSERT INTO outlet_qr_codes (business_id, outlet_id, qr_token, label, is_active)
     VALUES ($1, $2, $3, $4, true)
     RETURNING id, created_at, updated_at`,
    [params.businessId, params.outletId, params.qrToken, params.label],
  );
  return rows[0];
}

export async function findQrCodeByBusinessId(
  qrBusinessId: string,
): Promise<QrCodeJoinedRow | null> {
  const { rows } = await query<QrCodeJoinedRow>(
    `SELECT qr.id, qr.business_id, qr.outlet_id,
            out.business_id AS outlet_business_id, out.name AS outlet_name, out.slug AS outlet_slug,
            qr.qr_token, qr.label, qr.is_active, qr.scans_count, qr.created_at, qr.updated_at
     FROM outlet_qr_codes qr
     INNER JOIN outlets out ON out.id = qr.outlet_id
     WHERE qr.business_id = $1`,
    [qrBusinessId],
  );
  return rows[0] ?? null;
}

export async function updateQrStatusRow(params: {
  qrBusinessId: string;
  isActive: boolean;
  label?: string;
}): Promise<{ updated_at: Date } | null> {
  const { rows } = await query<{ updated_at: Date }>(
    `UPDATE outlet_qr_codes
     SET is_active = $2,
         label = COALESCE($3, label),
         updated_at = CURRENT_TIMESTAMP
     WHERE business_id = $1
     RETURNING updated_at`,
    [params.qrBusinessId, params.isActive, params.label ?? null],
  );
  return rows[0] ?? null;
}
