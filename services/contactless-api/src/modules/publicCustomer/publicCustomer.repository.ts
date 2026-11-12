import type { PoolClient } from 'pg';
import { query } from '../../database/connection';
import type {
  CustomerDbRow,
  CustomerOrderHistoryDbRow,
} from './publicCustomer.dto';

export async function findCustomerByPhone(
  phone: string,
  client?: PoolClient,
): Promise<CustomerDbRow | null> {
  const sql = `SELECT id, business_id, full_name, phone, last_outlet_id, created_at, updated_at
               FROM customers
               WHERE phone = $1`;
  const result = client
    ? await client.query<CustomerDbRow>(sql, [phone])
    : await query<CustomerDbRow>(sql, [phone]);
  return result.rows[0] ?? null;
}

export async function findCustomerById(
  customerId: string,
): Promise<CustomerDbRow | null> {
  const { rows } = await query<CustomerDbRow>(
    `SELECT id, business_id, full_name, phone, last_outlet_id, created_at, updated_at
     FROM customers
     WHERE id = $1`,
    [customerId],
  );
  return rows[0] ?? null;
}

export async function upsertCustomerProfile(
  client: PoolClient,
  params: {
    businessId: string;
    fullName: string;
    phone: string;
    lastOutletId?: string | null;
  },
): Promise<CustomerDbRow> {
  const { rows } = await client.query<CustomerDbRow>(
    `INSERT INTO customers (business_id, full_name, phone, last_outlet_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE
     SET full_name = CASE
           WHEN $2 <> '' AND $2 <> 'Sharon Guest' THEN $2
           ELSE customers.full_name
         END,
         last_outlet_id = COALESCE($4, customers.last_outlet_id),
         updated_at = CURRENT_TIMESTAMP
     RETURNING id, business_id, full_name, phone, last_outlet_id, created_at, updated_at`,
    [params.businessId, params.fullName, params.phone, params.lastOutletId ?? null],
  );
  return rows[0];
}

export async function updateCustomerFullName(
  customerId: string,
  fullName: string,
  client?: PoolClient,
): Promise<CustomerDbRow | null> {
  const sql = `UPDATE customers
               SET full_name = $2,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $1
               RETURNING id, business_id, full_name, phone, last_outlet_id, created_at, updated_at`;
  const result = client
    ? await client.query<CustomerDbRow>(sql, [customerId, fullName])
    : await query<CustomerDbRow>(sql, [customerId, fullName]);
  return result.rows[0] ?? null;
}

export async function findCustomerOrders(
  customerId: string,
  phone: string,
): Promise<CustomerOrderHistoryDbRow[]> {
  const { rows } = await query<CustomerOrderHistoryDbRow>(
    `SELECT o.business_id, o.order_number,
            out.business_id AS outlet_business_id, out.name AS outlet_name, out.slug AS outlet_slug,
            o.items, o.subtotal::text AS subtotal, o.tax::text AS tax, o.total_amount::text AS total_amount,
            o.payment_provider, o.payment_status, o.order_status, o.created_at
     FROM orders o
     INNER JOIN outlets out ON out.id = o.outlet_id
     WHERE o.customer_id = $1 OR o.customer_phone = $2
     ORDER BY o.created_at DESC
     LIMIT 50`,
    [customerId, phone],
  );
  return rows;
}
