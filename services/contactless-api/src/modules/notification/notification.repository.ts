import type { PushTargetRole } from '@sharon/shared';
import type { PoolClient } from 'pg';
import { query } from '../../database/connection';
import type { PushTokenRegistrationRow } from './notification.dto';

export interface OrderPushContextRow {
  id: string;
  business_id: string;
  outlet_id: string;
  customer_id: string | null;
  customer_phone: string | null;
  order_number: string;
}

export async function findOutletIdBySlugForPush(outletSlug: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM outlets WHERE slug = $1 AND is_active = true`,
    [outletSlug],
  );
  return rows[0]?.id ?? null;
}

export async function findOutletByBusinessIdForPush(
  outletBusinessId: string,
): Promise<{ id: string; business_id: string; name: string } | null> {
  const { rows } = await query<{ id: string; business_id: string; name: string }>(
    `SELECT id, business_id, name FROM outlets WHERE business_id = $1 AND is_active = true`,
    [outletBusinessId],
  );
  return rows[0] ?? null;
}

export async function findOutletNameByIdForPush(outletId: string): Promise<string | null> {
  const { rows } = await query<{ name: string }>(
    `SELECT name FROM outlets WHERE id = $1`,
    [outletId],
  );
  return rows[0]?.name ?? null;
}

export async function findOrderContextForPush(
  orderBusinessId: string,
): Promise<OrderPushContextRow | null> {
  const { rows } = await query<OrderPushContextRow>(
    `SELECT id, business_id, outlet_id, customer_id, customer_phone, order_number
     FROM orders
     WHERE business_id = $1`,
    [orderBusinessId],
  );
  return rows[0] ?? null;
}

export async function upsertPushNotificationToken(
  client: PoolClient,
  params: {
    businessId: string;
    fcmToken: string;
    targetRole: PushTargetRole;
    userId: string | null;
    outletId: string | null;
    customerId: string | null;
    customerPhone: string | null;
    orderBusinessId: string | null;
    platform?: string;
  },
): Promise<PushTokenRegistrationRow> {
  const { rows } = await client.query<PushTokenRegistrationRow>(
    `INSERT INTO push_notification_tokens (
       business_id, fcm_token, target_role, user_id, outlet_id,
       customer_id, customer_phone, order_business_id, platform,
       is_active, last_seen_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT (fcm_token) DO UPDATE
     SET target_role = EXCLUDED.target_role,
         user_id = EXCLUDED.user_id,
         outlet_id = EXCLUDED.outlet_id,
         customer_id = COALESCE(EXCLUDED.customer_id, push_notification_tokens.customer_id),
         customer_phone = COALESCE(EXCLUDED.customer_phone, push_notification_tokens.customer_phone),
         order_business_id = COALESCE(EXCLUDED.order_business_id, push_notification_tokens.order_business_id),
         platform = EXCLUDED.platform,
         is_active = true,
         last_seen_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     RETURNING business_id, target_role, updated_at`,
    [
      params.businessId,
      params.fcmToken,
      params.targetRole,
      params.userId,
      params.outletId,
      params.customerId,
      params.customerPhone,
      params.orderBusinessId,
      params.platform ?? 'WEB_PWA',
    ],
  );
  return rows[0];
}

export async function deactivateCustomerPushToken(fcmToken: string): Promise<void> {
  await query(
    `UPDATE push_notification_tokens
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE fcm_token = $1 AND target_role = 'CUSTOMER'`,
    [fcmToken],
  );
}

export async function deactivateStaffPushToken(
  userId: string,
  fcmToken: string,
): Promise<void> {
  await query(
    `UPDATE push_notification_tokens
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE fcm_token = $1 AND user_id = $2 AND target_role = 'STAFF'`,
    [fcmToken, userId],
  );
}

export async function countActiveStaffPushDevices(userId: string): Promise<number> {
  const { rows } = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM push_notification_tokens
     WHERE user_id = $1 AND target_role = 'STAFF' AND is_active = true`,
    [userId],
  );
  return rows[0]?.count ?? 0;
}

export async function findActiveStaffPushTokensForOutlet(
  outletId: string,
): Promise<string[]> {
  const { rows } = await query<{ fcm_token: string }>(
    `SELECT DISTINCT fcm_token
     FROM push_notification_tokens
     WHERE target_role = 'STAFF'
       AND is_active = true
       AND (outlet_id = $1 OR outlet_id IS NULL)`,
    [outletId],
  );
  return rows.map((row) => row.fcm_token);
}

export async function findActiveCustomerPushTokens(params: {
  orderBusinessId: string;
  customerId: string | null;
  customerPhone: string | null;
}): Promise<string[]> {
  const { rows } = await query<{ fcm_token: string }>(
    `SELECT DISTINCT fcm_token
     FROM push_notification_tokens
     WHERE target_role = 'CUSTOMER'
       AND is_active = true
       AND (
         order_business_id = $1
         OR ($2::uuid IS NOT NULL AND customer_id = $2)
         OR ($3::text IS NOT NULL AND customer_phone = $3)
       )`,
    [params.orderBusinessId, params.customerId, params.customerPhone],
  );
  return rows.map((row) => row.fcm_token);
}

export async function deactivateInvalidPushTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) {
    return;
  }
  await query(
    `UPDATE push_notification_tokens
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE fcm_token = ANY($1::text[])`,
    [tokens],
  );
}
