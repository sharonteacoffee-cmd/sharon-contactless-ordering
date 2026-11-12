import {
  toUTCISOString,
  type CustomerLookupResult,
  type CustomerOrderHistoryItem,
  type CustomerProfileDto,
  type OrderLineItem,
  type OrderStatus,
  type PaymentProvider,
  type PaymentStatus,
} from '@sharon/shared';
import { maskCustomerPhone } from '../publicOrder/publicOrder.dto';

export interface CustomerDbRow {
  id: string;
  business_id: string;
  full_name: string;
  phone: string;
  last_outlet_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CustomerOrderHistoryDbRow {
  business_id: string;
  order_number: string;
  outlet_business_id: string;
  outlet_name: string;
  outlet_slug: string;
  items: OrderLineItem[];
  subtotal: string;
  tax: string;
  total_amount: string;
  payment_provider: PaymentProvider;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  created_at: Date;
}

export function toCustomerLookupDto(row: CustomerDbRow | null): CustomerLookupResult {
  if (!row) {
    return { found: false, fullName: null };
  }
  return { found: true, fullName: row.full_name };
}

export function toCustomerProfileDto(row: CustomerDbRow): CustomerProfileDto {
  return {
    businessId: row.business_id,
    fullName: row.full_name,
    phone: row.phone,
    maskedPhone: maskCustomerPhone(row.phone),
    createdAt: toUTCISOString(row.created_at),
    updatedAt: toUTCISOString(row.updated_at),
  };
}

export function toCustomerOrderHistoryItemDto(
  row: CustomerOrderHistoryDbRow,
): CustomerOrderHistoryItem {
  return {
    orderBusinessId: row.business_id,
    orderNumber: row.order_number,
    outletBusinessId: row.outlet_business_id,
    outletName: row.outlet_name,
    outletSlug: row.outlet_slug,
    items: row.items,
    subtotal: Number(Number(row.subtotal).toFixed(2)),
    tax: Number(Number(row.tax).toFixed(2)),
    totalAmount: Number(Number(row.total_amount).toFixed(2)),
    paymentProvider: row.payment_provider,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    createdAt: toUTCISOString(row.created_at),
  };
}
