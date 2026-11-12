import {
  toUTCISOString,
  type OrderLineItem,
  type OrderStatus,
  type OrderTrackingInfo,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentStatus,
  type UpiPayload,
} from '@sharon/shared';

export interface PublicOrderJoinedRow {
  id: string;
  business_id: string;
  payment_transaction_id: string | null;
  order_number: string;
  outlet_id: string;
  outlet_business_id: string;
  outlet_name: string;
  outlet_slug: string;
  outlet_upi_vpa: string;
  outlet_upi_payee_name: string;
  outlet_payment_provider: PaymentProvider;
  outlet_demo_auto_verify: boolean;
  outlet_estimated_prep_time_minutes: number;
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

export interface CreatePublicOrderResponseDto {
  orderBusinessId: string;
  orderNumber: string;
  paymentTransactionId: string;
  outletName: string;
  totalAmount: number;
  paymentProvider: PaymentProvider;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  upiPayload?: UpiPayload;
  gatewayOrderId?: string;
  createdAt: string;
}

export function maskCustomerPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    return '••••••';
  }
  const last4 = digits.slice(-4);
  return `+91 •••••• ${last4}`;
}

export function toPublicOrderTrackingDto(
  row: PublicOrderJoinedRow,
  upiPayload?: UpiPayload,
): OrderTrackingInfo {
  return {
    orderBusinessId: row.business_id,
    orderNumber: row.order_number,
    outletBusinessId: row.outlet_business_id,
    outletName: row.outlet_name,
    outletSlug: row.outlet_slug,
    customerName: row.customer_name,
    maskedCustomerPhone: maskCustomerPhone(row.customer_phone),
    tableOrToken: row.table_or_token,
    items: row.items,
    subtotal: Number(Number(row.subtotal).toFixed(2)),
    tax: Number(Number(row.tax).toFixed(2)),
    totalAmount: Number(Number(row.total_amount).toFixed(2)),
    paymentProvider: row.payment_provider,
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
    ...(upiPayload ? { upiPayload } : {}),
    estimatedPrepTimeMinutes: row.outlet_estimated_prep_time_minutes,
    createdAt: toUTCISOString(row.created_at),
    updatedAt: toUTCISOString(row.updated_at),
  };
}
