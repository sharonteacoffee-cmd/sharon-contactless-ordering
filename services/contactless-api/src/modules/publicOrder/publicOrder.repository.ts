import type { PoolClient } from 'pg';
import type {
  OrderLineItem,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@sharon/shared';
import { query } from '../../database/connection';
import type { PublicOrderJoinedRow } from './publicOrder.dto';

export interface PricedMenuItemRow {
  id: string;
  name: string;
  base_price: string;
  custom_price: string | null;
  is_active: boolean;
  is_available: boolean;
}

export interface ModifierOptionJoinedRow {
  option_id: string;
  option_name: string;
  price_extra: string;
  group_id: string;
  group_name: string;
  max_selection: number;
}

export async function findOutletMenuItemsForOrder(
  client: PoolClient,
  outletId: string,
  menuItemIds: string[],
): Promise<PricedMenuItemRow[]> {
  const { rows } = await client.query<PricedMenuItemRow>(
    `SELECT mi.id, mi.name, mi.price::text AS base_price,
            omi.custom_price::text AS custom_price,
            mi.is_active,
            COALESCE(omi.is_available, true) AS is_available
     FROM menu_items mi
     LEFT JOIN outlet_menu_items omi
       ON omi.menu_item_id = mi.id AND omi.outlet_id = $1
     WHERE mi.id = ANY($2::uuid[])`,
    [outletId, menuItemIds],
  );
  return rows;
}

export async function findModifierOptionsForOrder(
  client: PoolClient,
  optionIds: string[],
): Promise<ModifierOptionJoinedRow[]> {
  if (optionIds.length === 0) {
    return [];
  }
  const { rows } = await client.query<ModifierOptionJoinedRow>(
    `SELECT mo.id AS option_id, mo.name AS option_name, mo.price_extra::text AS price_extra,
            mg.id AS group_id, mg.name AS group_name, mg.max_selection
     FROM modifier_options mo
     INNER JOIN modifier_groups mg ON mg.id = mo.group_id
     WHERE mo.id = ANY($1::uuid[])`,
    [optionIds],
  );
  return rows;
}

export interface InsertOrderParams {
  businessId: string;
  paymentTransactionId: string;
  orderNumber: string;
  outletId: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  tableOrToken: string | null;
  items: OrderLineItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentProvider: PaymentProvider;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  notes: string | null;
}

export async function insertOrder(
  client: PoolClient,
  params: InsertOrderParams,
): Promise<{ id: string; created_at: Date; updated_at: Date }> {
  const { rows } = await client.query<{ id: string; created_at: Date; updated_at: Date }>(
    `INSERT INTO orders (
       business_id, payment_transaction_id, order_number, outlet_id, customer_id,
       customer_name, customer_phone, table_or_token, items,
       subtotal, tax, total_amount, payment_provider, payment_method,
       payment_status, order_status, notes
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13, $14, $15, $16, $17)
     RETURNING id, created_at, updated_at`,
    [
      params.businessId,
      params.paymentTransactionId,
      params.orderNumber,
      params.outletId,
      params.customerId ?? null,
      params.customerName,
      params.customerPhone,
      params.tableOrToken,
      JSON.stringify(params.items),
      params.subtotal.toFixed(2),
      params.tax.toFixed(2),
      params.totalAmount.toFixed(2),
      params.paymentProvider,
      params.paymentMethod,
      params.paymentStatus,
      params.orderStatus,
      params.notes,
    ],
  );
  return rows[0];
}

export async function findPublicOrderJoinedByBusinessId(
  orderBusinessId: string,
): Promise<PublicOrderJoinedRow | null> {
  const { rows } = await query<PublicOrderJoinedRow>(
    `SELECT o.id, o.business_id, o.payment_transaction_id, o.order_number,
            o.outlet_id, out.business_id AS outlet_business_id,
            out.name AS outlet_name, out.slug AS outlet_slug,
            out.upi_vpa AS outlet_upi_vpa, out.upi_payee_name AS outlet_upi_payee_name,
            out.payment_provider AS outlet_payment_provider,
            out.demo_auto_verify_payment AS outlet_demo_auto_verify,
            out.estimated_prep_time_minutes AS outlet_estimated_prep_time_minutes,
            o.customer_name, o.customer_phone, o.table_or_token, o.items,
            o.subtotal::text AS subtotal, o.tax::text AS tax, o.total_amount::text AS total_amount,
            o.payment_provider, o.payment_method, o.payment_status, o.payment_reference,
            o.order_status, o.notes, o.created_at, o.updated_at
     FROM orders o
     INNER JOIN outlets out ON out.id = o.outlet_id
     WHERE o.business_id = $1`,
    [orderBusinessId],
  );
  return rows[0] ?? null;
}

export async function updateOrderToDemoClaimed(
  orderBusinessId: string,
): Promise<{ updated_at: Date } | null> {
  const { rows } = await query<{ updated_at: Date }>(
    `UPDATE orders
     SET payment_status = 'UPI_CLAIMED_DEMO',
         updated_at = CURRENT_TIMESTAMP
     WHERE business_id = $1 AND payment_status = 'PAYMENT_PENDING'
     RETURNING updated_at`,
    [orderBusinessId],
  );
  return rows[0] ?? null;
}

export async function autoVerifyDemoOrder(
  orderBusinessId: string,
  paymentReference: string,
): Promise<{ updated_at: Date } | null> {
  const { rows } = await query<{ updated_at: Date }>(
    `UPDATE orders
     SET payment_status = 'PAID_VERIFIED',
         order_status = CASE WHEN order_status = 'RECEIVED' THEN 'PREPARING' ELSE order_status END,
         payment_reference = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE business_id = $1 AND payment_status = 'UPI_CLAIMED_DEMO'
     RETURNING updated_at`,
    [orderBusinessId, paymentReference],
  );
  return rows[0] ?? null;
}
