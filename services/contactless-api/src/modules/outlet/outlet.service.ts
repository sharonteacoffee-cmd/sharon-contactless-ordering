import {
  toUTCISOString,
  type CreateOutletInput,
  type CustomerAuthMode,
  type PaymentProvider,
  type UpdateOutletFullInput,
  type UpdateOutletSettingsInput,
} from '@sharon/shared';
import { AppError } from '../../utils/appError';
import type { OutletDbRow } from '../publicOutlet/publicOutlet.types';
import {
  deleteOrDeactivateOutletRow,
  findAllOutletsForAdmin,
  findOutletByBusinessId,
  findOutletByNameOrSlug,
  insertOutletWithTransaction,
  updateOutletFullRow,
} from './outlet.repository';

export interface PrivateOutletDto {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  imageUrl: string | null;
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
    imageUrl: row.image_url ?? null,
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

export async function createOutlet(
  input: CreateOutletInput,
): Promise<PrivateOutletDto> {
  const trimmedName = input.name.trim();
  const existing = await findOutletByNameOrSlug(trimmedName, input.slug);
  if (existing) {
    throw new AppError(
      409,
      'CONFLICT',
      `An outlet with the name "${trimmedName}" or slug "${existing.slug}" already exists.`,
    );
  }
  const row = await insertOutletWithTransaction(input);
  return toPrivateOutletDto(row);
}

export async function updateOutlet(
  outletBusinessId: string,
  input: UpdateOutletFullInput,
): Promise<PrivateOutletDto> {
  const existing = await findOutletByBusinessId(outletBusinessId);
  if (!existing) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', `Outlet ${outletBusinessId} not found`);
  }
  const updated = await updateOutletFullRow(outletBusinessId, input);
  if (!updated) {
    throw new AppError(500, 'UPDATE_FAILED', `Failed to update outlet ${outletBusinessId}`);
  }
  return toPrivateOutletDto(updated);
}

export async function updateOutletSettings(
  outletBusinessId: string,
  input: UpdateOutletSettingsInput,
): Promise<PrivateOutletDto> {
  return updateOutlet(outletBusinessId, input as UpdateOutletFullInput);
}

export async function deleteOutlet(
  outletBusinessId: string,
): Promise<{ businessId: string; deleted: boolean; deactivated: boolean }> {
  const existing = await findOutletByBusinessId(outletBusinessId);
  if (!existing) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', `Outlet ${outletBusinessId} not found`);
  }
  const res = await deleteOrDeactivateOutletRow(outletBusinessId);
  return {
    businessId: outletBusinessId,
    deleted: res.deleted,
    deactivated: res.deactivated,
  };
}
