import type {
  CreateOutletInput,
  UpdateOutletFullInput,
  UpdateOutletSettingsInput,
} from '@sharon/shared';
import { generateNextBusinessId } from '../../database/businessIdGenerator';
import { query, withTransaction } from '../../database/connection';
import type { OutletDbRow } from '../publicOutlet/publicOutlet.types';

export async function findAllOutletsForAdmin(): Promise<OutletDbRow[]> {
  const { rows } = await query<OutletDbRow>(
    `SELECT id, business_id, name, slug, address, phone, image_url, operating_hours,
            is_active, is_ordering_enabled, customer_auth_mode,
            require_customer_phone, require_customer_name,
            payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
            estimated_prep_time_minutes, created_at, updated_at
     FROM outlets
     ORDER BY created_at DESC`,
  );
  return rows;
}

export async function findOutletByBusinessId(
  outletBusinessId: string,
): Promise<OutletDbRow | null> {
  const { rows } = await query<OutletDbRow>(
    `SELECT id, business_id, name, slug, address, phone, image_url, operating_hours,
            is_active, is_ordering_enabled, customer_auth_mode,
            require_customer_phone, require_customer_name,
            payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
            estimated_prep_time_minutes, created_at, updated_at
     FROM outlets
     WHERE business_id = $1`,
    [outletBusinessId],
  );
  return rows[0] ?? null;
}

export async function findOutletByNameOrSlug(
  name: string,
  slug?: string | null,
): Promise<OutletDbRow | null> {
  const normalizedSlug = (slug || name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const { rows } = await query<OutletDbRow>(
    `SELECT id, business_id, name, slug, address, phone, image_url, operating_hours,
            is_active, is_ordering_enabled, customer_auth_mode,
            require_customer_phone, require_customer_name,
            payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
            estimated_prep_time_minutes, created_at, updated_at
     FROM outlets
     WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) OR slug = $2
     LIMIT 1`,
    [name.trim(), normalizedSlug],
  );
  return rows[0] ?? null;
}

export async function insertOutletWithTransaction(
  input: CreateOutletInput,
): Promise<OutletDbRow> {
  return withTransaction(async (client) => {
    const businessId = await generateNextBusinessId(
      client,
      'OUT',
      'seq_outlet_business_id',
    );

    // Generate safe slug if not provided or ensure uniqueness
    let slug = (input.slug || input.name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) slug = `outlet-${Date.now()}`;

    const existingSlug = await client.query<{ id: string }>(
      'SELECT id FROM outlets WHERE slug = $1',
      [slug],
    );
    if (existingSlug.rows.length > 0) {
      slug = `${slug}-${businessId.slice(-4).toLowerCase()}`;
    }

    const { rows } = await client.query<OutletDbRow>(
      `INSERT INTO outlets (
         business_id, name, slug, address, phone, image_url, operating_hours,
         is_active, is_ordering_enabled, customer_auth_mode,
         require_customer_phone, require_customer_name,
         payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
         estimated_prep_time_minutes
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING id, business_id, name, slug, address, phone, image_url, operating_hours,
                 is_active, is_ordering_enabled, customer_auth_mode,
                 require_customer_phone, require_customer_name,
                 payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
                 estimated_prep_time_minutes, created_at, updated_at`,
      [
        businessId,
        input.name.trim(),
        slug,
        input.address.trim(),
        input.phone.trim(),
        input.imageUrl?.trim() || null,
        input.operatingHours || '6:00 AM - 11:00 PM',
        input.isActive ?? true,
        input.isOrderingEnabled ?? true,
        input.customerAuthMode || 'DIRECT_GUEST',
        input.requireCustomerPhone ?? true,
        input.requireCustomerName ?? true,
        input.paymentProvider || 'DEMO_UPI_INTENT',
        input.demoAutoVerifyPayment ?? false,
        input.upiVpa?.trim() || 'paytm.s211ne7@pty',
        input.upiPayeeName?.trim() || 'MUNISWAMY JOSHVA',
        input.estimatedPrepTimeMinutes || 5,
      ],
    );

    const newOutlet = rows[0];

    // Automatically link all existing active menu items to this new outlet in outlet_menu_items
    await client.query(
      `INSERT INTO outlet_menu_items (outlet_id, menu_item_id, is_available)
       SELECT $1, id, true
       FROM menu_items
       WHERE is_active = true
       ON CONFLICT (outlet_id, menu_item_id) DO NOTHING`,
      [newOutlet.id],
    );

    return newOutlet;
  });
}

export async function updateOutletFullRow(
  outletBusinessId: string,
  input: UpdateOutletFullInput,
): Promise<OutletDbRow | null> {
  const fieldMappings: Array<[keyof UpdateOutletFullInput, string]> = [
    ['name', 'name'],
    ['slug', 'slug'],
    ['address', 'address'],
    ['phone', 'phone'],
    ['imageUrl', 'image_url'],
    ['operatingHours', 'operating_hours'],
    ['isActive', 'is_active'],
    ['isOrderingEnabled', 'is_ordering_enabled'],
    ['customerAuthMode', 'customer_auth_mode'],
    ['requireCustomerPhone', 'require_customer_phone'],
    ['requireCustomerName', 'require_customer_name'],
    ['paymentProvider', 'payment_provider'],
    ['demoAutoVerifyPayment', 'demo_auto_verify_payment'],
    ['upiVpa', 'upi_vpa'],
    ['upiPayeeName', 'upi_payee_name'],
    ['estimatedPrepTimeMinutes', 'estimated_prep_time_minutes'],
  ];

  const setClauses: string[] = [];
  const params: unknown[] = [];

  for (const [key, column] of fieldMappings) {
    const val = input[key];
    if (val !== undefined) {
      params.push(val);
      setClauses.push(`${column} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    return findOutletByBusinessId(outletBusinessId);
  }

  params.push(outletBusinessId);
  const { rows } = await query<OutletDbRow>(
    `UPDATE outlets
     SET ${setClauses.join(', ')},
         updated_at = CURRENT_TIMESTAMP
     WHERE business_id = $${params.length}
     RETURNING id, business_id, name, slug, address, phone, image_url, operating_hours,
               is_active, is_ordering_enabled, customer_auth_mode,
               require_customer_phone, require_customer_name,
               payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
               estimated_prep_time_minutes, created_at, updated_at`,
    params,
  );

  return rows[0] ?? null;
}

export async function updateOutletSettingsRow(
  outletBusinessId: string,
  input: UpdateOutletSettingsInput,
): Promise<OutletDbRow | null> {
  return updateOutletFullRow(outletBusinessId, input as UpdateOutletFullInput);
}

export async function deleteOrDeactivateOutletRow(
  outletBusinessId: string,
): Promise<{ deleted: boolean; deactivated: boolean }> {
  return withTransaction(async (client) => {
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM outlets WHERE business_id = $1',
      [outletBusinessId],
    );
    if (existing.rows.length === 0) {
      return { deleted: false, deactivated: false };
    }
    const outletId = existing.rows[0].id;

    const ordersCount = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM orders WHERE outlet_id = $1',
      [outletId],
    );

    if (parseInt(ordersCount.rows[0].count, 10) > 0) {
      // Historical orders exist: safely deactivate instead of dropping foreign keys
      await client.query(
        `UPDATE outlets
         SET is_active = false,
             is_ordering_enabled = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [outletId],
      );
      return { deleted: false, deactivated: true };
    }

    // No orders: delete clean
    await client.query('DELETE FROM outlets WHERE id = $1', [outletId]);
    return { deleted: true, deactivated: false };
  });
}
