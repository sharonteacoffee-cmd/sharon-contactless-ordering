import type { UpdateOutletSettingsInput } from '@sharon/shared';
import { query } from '../../database/connection';
import type { OutletDbRow } from '../publicOutlet/publicOutlet.types';

export async function findAllOutletsForAdmin(): Promise<OutletDbRow[]> {
  const { rows } = await query<OutletDbRow>(
    `SELECT id, business_id, name, slug, address, phone, operating_hours,
            is_active, is_ordering_enabled, customer_auth_mode,
            require_customer_phone, require_customer_name,
            payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
            estimated_prep_time_minutes, created_at, updated_at
     FROM outlets
     ORDER BY name ASC`,
  );
  return rows;
}

export async function updateOutletSettingsRow(
  outletBusinessId: string,
  input: UpdateOutletSettingsInput,
): Promise<OutletDbRow | null> {
  const fieldMappings: Array<[keyof UpdateOutletSettingsInput, string]> = [
    ['name', 'name'],
    ['address', 'address'],
    ['phone', 'phone'],
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
    const { rows } = await query<OutletDbRow>(
      `SELECT id, business_id, name, slug, address, phone, operating_hours,
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

  params.push(outletBusinessId);
  const { rows } = await query<OutletDbRow>(
    `UPDATE outlets
     SET ${setClauses.join(', ')},
         updated_at = CURRENT_TIMESTAMP
     WHERE business_id = $${params.length}
     RETURNING id, business_id, name, slug, address, phone, operating_hours,
               is_active, is_ordering_enabled, customer_auth_mode,
               require_customer_phone, require_customer_name,
               payment_provider, demo_auto_verify_payment, upi_vpa, upi_payee_name,
               estimated_prep_time_minutes, created_at, updated_at`,
    params,
  );

  return rows[0] ?? null;
}
