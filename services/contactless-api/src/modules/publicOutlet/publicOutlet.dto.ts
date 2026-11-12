import type { OutletPublicInfo } from '@sharon/shared';
import type { OutletDbRow } from './publicOutlet.types';

/**
 * Strict public DTO allowlist — never exposes upiVpa, upiPayeeName,
 * demoAutoVerifyPayment, staff phone/emails, or QR scan counts.
 */
export function toPublicOutletDto(row: OutletDbRow): OutletPublicInfo {
  return {
    businessId: row.business_id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    operatingHours: row.operating_hours,
    isOrderingEnabled: row.is_ordering_enabled,
    customerAuthMode: row.customer_auth_mode,
    requireCustomerPhone: row.require_customer_phone,
    requireCustomerName: row.require_customer_name,
    paymentProvider: row.payment_provider,
    estimatedPrepTimeMinutes: row.estimated_prep_time_minutes,
  };
}
