import type { PoolClient } from 'pg';

export type BusinessIdPrefix =
  | 'USR'
  | 'OUT'
  | 'ORD'
  | 'TXN'
  | 'QR'
  | 'SYNC'
  | 'CUS'
  | 'PSH';

export const BUSINESS_ID_SEQUENCES: Record<BusinessIdPrefix, string> = {
  OUT: 'seq_outlet_business_id',
  USR: 'seq_user_business_id',
  ORD: 'seq_order_business_id',
  TXN: 'seq_payment_txn_business_id',
  QR: 'seq_qr_business_id',
  SYNC: 'seq_menu_sync_business_id',
  CUS: 'seq_customer_business_id',
  PSH: 'seq_push_token_business_id',
};

const OUTLET_CODE_MAP: Record<string, string> = {
  indiranagar: 'IND',
  'new-thippasandra': 'NTH',
  kaggadasapura: 'KAG',
};

export function resolveOutletTokenCode(outletSlug: string): string {
  const mapped = OUTLET_CODE_MAP[outletSlug.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  const cleaned = outletSlug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return (cleaned.slice(0, 3) || 'SHN').padEnd(3, 'X');
}

/**
 * Generates concurrency-safe business IDs using PostgreSQL sequences (`nextval`),
 * formatted as `<PREFIX><YYMMDD><ZERO_PADDED_SEQ>` in UTC.
 */
export async function generateNextBusinessId(
  client: PoolClient,
  prefix: BusinessIdPrefix,
  sequenceName: string = BUSINESS_ID_SEQUENCES[prefix],
  nowUtc: Date = new Date(),
): Promise<string> {
  const allowedSequence = BUSINESS_ID_SEQUENCES[prefix];
  if (sequenceName !== allowedSequence) {
    throw new Error(`Invalid sequence name for prefix ${prefix}`);
  }

  const { rows } = await client.query<{ seq: string }>(
    'SELECT nextval($1)::text AS seq',
    [sequenceName],
  );
  const seq = rows[0]?.seq ?? '1';
  const yy = String(nowUtc.getUTCFullYear()).slice(-2);
  const mm = String(nowUtc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(nowUtc.getUTCDate()).padStart(2, '0');
  const padded = seq.padStart(4, '0');
  return `${prefix}${yy}${mm}${dd}${padded}`;
}

/**
 * Generates concurrency-safe per-outlet counter tokens (`#SH-IND-101`, `#SH-IND-102`, ...)
 * via atomic PostgreSQL row UPSERT inside the order transaction.
 */
export async function generateNextOutletOrderNumber(
  client: PoolClient,
  outletId: string,
  outletSlug: string,
): Promise<string> {
  const outletCode = resolveOutletTokenCode(outletSlug);
  const { rows } = await client.query<{ outlet_code: string; last_sequence: number }>(
    `INSERT INTO outlet_order_counters (outlet_id, outlet_code, last_sequence, updated_at)
     VALUES ($1, $2, 101, CURRENT_TIMESTAMP)
     ON CONFLICT (outlet_id) DO UPDATE
     SET last_sequence = outlet_order_counters.last_sequence + 1,
         updated_at = CURRENT_TIMESTAMP
     RETURNING outlet_code, last_sequence`,
    [outletId, outletCode],
  );

  const row = rows[0];
  return `#SH-${row.outlet_code}-${row.last_sequence}`;
}

export async function generatePushTokenBusinessId(
  client: PoolClient,
  nowUtc: Date = new Date(),
): Promise<string> {
  return generateNextBusinessId(client, 'PSH', 'seq_push_token_business_id', nowUtc);
}
