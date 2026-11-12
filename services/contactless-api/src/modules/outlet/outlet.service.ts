import {
  toUTCISOString,
  type CustomerAuthMode,
  type PaymentProvider,
  type UpdateOutletSettingsInput,
} from '@sharon/shared';
import { AppError } from '../../utils/appError';
import type { OutletDbRow } from '../publicOutlet/publicOutlet.types';
import {
  findAllOutletsForAdmin,
  updateOutletSettingsRow,
} from './outlet.repository';

export interface PrivateOutletDto {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  operatingHours: string;
  isActive: boolean;
  isOrderingEnabled: boolean;
  customerAuthMode: CustomerAuthMode;
  requireCustomerPhone: boolean;
  requireCustomerName: boolean;
  paymentProvider: PaymentProvider;
  demoAutoVerifyPayment: boolean;
  upiVpa: string;
  upiPayeeName: string;
  estimatedPrepTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

function toPrivateOutletDto(row: OutletDbRow): PrivateOutletDto {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    slug: row.slug,
    address: row.address,
    phone: row.phone,
    operatingHours: row.operating_hours,
    isActive: row.is_active,
    isOrderingEnabled: row.is_ordering_enabled,
    customerAuthMode: row.customer_auth_mode,
    requireCustomerPhone: row.require_customer_phone,
    requireCustomerName: row.require_customer_name,
    paymentProvider: row.payment_provider,
    demoAutoVerifyPayment: row.demo_auto_verify_payment,
    upiVpa: row.upi_vpa,
    upiPayeeName: row.upi_payee_name,
    estimatedPrepTimeMinutes: row.estimated_prep_time_minutes,
    createdAt: toUTCISOString(row.created_at),
    updatedAt: toUTCISOString(row.updated_at),
  };
}

export async function getOutlets(): Promise<PrivateOutletDto[]> {
  const rows = await findAllOutletsForAdmin();
  return rows.map(toPrivateOutletDto);
}

export async function updateOutletSettings(
  outletBusinessId: string,
  input: UpdateOutletSettingsInput,
): Promise<PrivateOutletDto> {
  const updated = await updateOutletSettingsRow(outletBusinessId, input);
  if (!updated) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }
  return toPrivateOutletDto(updated);
}
