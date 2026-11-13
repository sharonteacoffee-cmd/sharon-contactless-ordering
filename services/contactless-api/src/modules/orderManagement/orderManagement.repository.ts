import type {
  OrderLineItem,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@sharon/shared';
import { query } from '../../database/connection';

export interface PrivateOrderDbRow {
  id: string;
  business_id: string;
  payment_transaction_id: string | null;
  order_number: string;
  outlet_id: string;
  outlet_business_id: string;
  outlet_name: string;
  customer_name: string;
  customer_phone: string;
  table_or_token: string | null;
  items: OrderLineItem[];
  subtotal: string;
  tax: string;
  total_amount: string;
  payment_provider: PaymentProvider;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  order_status: OrderStatus;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function findLiveOrders(
  outletId: string | null,
  completedLimit = 30,
): Promise<PrivateOrderDbRow[]> {
  const params: unknown[] = [];
  let outletFilter = '';
  if (outletId) {
    params.push(outletId);
    outletFilter = `AND o.outlet_id = $${params.length}`;
  }
  params.push(completedLimit);
  const limitIdx = params.length;

  const { rows } = await query<PrivateOrderDbRow>(
    `WITH active_orders AS (
       SELECT o.id, o.business_id, o.payment_transaction_id, o.order_number,
              o.outlet_id, out.business_id AS outlet_business_id, out.name AS outlet_name,
              o.customer_name, o.customer_phone, o.table_or_token, o.items,
              o.subtotal::text AS subtotal, o.tax::text AS tax, o.total_amount::text AS total_amount,
              o.payment_provider, o.payment_method, o.payment_status, o.payment_reference,
              o.order_status, o.notes, o.created_at, o.updated_at,
              1 AS sort_group,
              o.created_at AS sort_time
       FROM orders o
       INNER JOIN outlets out ON out.id = o.outlet_id
       WHERE o.order_status IN ('RECEIVED', 'PREPARING', 'READY')
         AND (o.payment_status <> 'PAYMENT_PENDING' OR o.order_status <> 'RECEIVED')
         ${outletFilter}
     ),
     completed_orders AS (
       SELECT o.id, o.business_id, o.payment_transaction_id, o.order_number,
              o.outlet_id, out.business_id AS outlet_business_id, out.name AS outlet_name,
              o.customer_name, o.customer_phone, o.table_or_token, o.items,
              o.subtotal::text AS subtotal, o.tax::text AS tax, o.total_amount::text AS total_amount,
              o.payment_provider, o.payment_method, o.payment_status, o.payment_reference,
              o.order_status, o.notes, o.created_at, o.updated_at,
              2 AS sort_group,
              o.updated_at AS sort_time
       FROM orders o
       INNER JOIN outlets out ON out.id = o.outlet_id
       WHERE o.order_status = 'COMPLETED'
         AND o.updated_at >= NOW() - INTERVAL '4 hours'
         ${outletFilter}
       ORDER BY o.updated_at DESC
       LIMIT $${limitIdx}
     )
     SELECT id, business_id, payment_transaction_id, order_number,
            outlet_id, outlet_business_id, outlet_name,
            customer_name, customer_phone, table_or_token, items,
            subtotal, tax, total_amount,
            payment_provider, payment_method, payment_status, payment_reference,
            order_status, notes, created_at, updated_at
     FROM (
       SELECT * FROM active_orders
       UNION ALL
       SELECT * FROM completed_orders
     ) combined
     ORDER BY sort_group ASC,
              CASE WHEN sort_group = 1 THEN sort_time END ASC,
              CASE WHEN sort_group = 2 THEN sort_time END DESC`,
    params,
  );
  return rows;
}

export interface OrderHistoryFilter {
  outletId: string | null;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  search?: string;
  fromUtc?: string;
  toUtc?: string;
  page: number;
  limit: number;
}

export async function findOrderHistory(
  filter: OrderHistoryFilter,
): Promise<{ rows: PrivateOrderDbRow[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.outletId) {
    params.push(filter.outletId);
    conditions.push(`o.outlet_id = $${params.length}`);
  }
  if (filter.orderStatus) {
    params.push(filter.orderStatus);
    conditions.push(`o.order_status = $${params.length}`);
  }
  if (filter.paymentStatus) {
    params.push(filter.paymentStatus);
    conditions.push(`o.payment_status = $${params.length}`);
  }
  if (filter.search) {
    params.push(`%${filter.search}%`);
    const idx = params.length;
    conditions.push(
      `(o.business_id ILIKE $${idx} OR o.order_number ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`,
    );
  }
  if (filter.fromUtc) {
    params.push(filter.fromUtc);
    conditions.push(`o.created_at >= $${params.length}::timestamptz`);
  }
  if (filter.toUtc) {
    params.push(filter.toUtc);
    conditions.push(`o.created_at <= $${params.length}::timestamptz`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (filter.page - 1) * filter.limit;

  const countRes = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total
     FROM orders o
     ${whereClause}`,
    params,
  );
  const total = Number(countRes.rows[0]?.total ?? '0');

  const dataParams = [...params, filter.limit, offset];
  const { rows } = await query<PrivateOrderDbRow>(
    `SELECT o.id, o.business_id, o.payment_transaction_id, o.order_number,
            o.outlet_id, out.business_id AS outlet_business_id, out.name AS outlet_name,
            o.customer_name, o.customer_phone, o.table_or_token, o.items,
            o.subtotal::text AS subtotal, o.tax::text AS tax, o.total_amount::text AS total_amount,
            o.payment_provider, o.payment_method, o.payment_status, o.payment_reference,
            o.order_status, o.notes, o.created_at, o.updated_at
     FROM orders o
     INNER JOIN outlets out ON out.id = o.outlet_id
     ${whereClause}
     ORDER BY o.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams,
  );

  return { rows, total };
}

export async function findPrivateOrderByBusinessId(
  orderBusinessId: string,
): Promise<PrivateOrderDbRow | null> {
  const { rows } = await query<PrivateOrderDbRow>(
    `SELECT o.id, o.business_id, o.payment_transaction_id, o.order_number,
            o.outlet_id, out.business_id AS outlet_business_id, out.name AS outlet_name,
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

export async function updateOrderStatusRow(params: {
  orderId: string;
  orderStatus: OrderStatus;
  notes?: string;
}): Promise<{ updated_at: Date }> {
  const { rows } = await query<{ updated_at: Date }>(
    `UPDATE orders
     SET order_status = $2,
         notes = COALESCE($3, notes),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING updated_at`,
    [params.orderId, params.orderStatus, params.notes ?? null],
  );
  return rows[0];
}

export async function verifyOrderPaymentRow(params: {
  orderId: string;
  paymentReference: string | null;
  nextOrderStatus: OrderStatus;
}): Promise<{ updated_at: Date }> {
  const { rows } = await query<{ updated_at: Date }>(
    `UPDATE orders
     SET payment_status = 'PAID_VERIFIED',
         payment_reference = COALESCE($2, payment_reference),
         order_status = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND payment_status = 'UPI_CLAIMED_DEMO'
     RETURNING updated_at`,
    [params.orderId, params.paymentReference, params.nextOrderStatus],
  );
  return rows[0];
}
