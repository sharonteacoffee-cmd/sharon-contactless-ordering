import {
  toUTCISOString,
  type ContactlessOrder,
  type OrderStatus,
  type PaymentStatus,
  type UpdateOrderStatusInput,
  type VerifyPaymentInput,
} from '@sharon/shared';
import {
  assertOutletBusinessIdScope,
  assertOutletScope,
} from '../../middleware/authorize.middleware';
import {
  emitOrderPaymentVerified,
  emitOrderStatusUpdated,
} from '../../socket/socketBroadcaster';
import type { AuthenticatedStaffUser } from '../../types/auth.types';
import { AppError } from '../../utils/appError';
import {
  notifyCustomerOrderStatus,
  notifyCustomerPaymentVerified,
} from '../notification/notification.service';
import { findOutletByBusinessId } from '../outletStock/outletStock.repository';
import {
  findLiveOrders,
  findOrderHistory,
  findPrivateOrderByBusinessId,
  updateOrderStatusRow,
  verifyOrderPaymentRow,
  type PrivateOrderDbRow,
} from './orderManagement.repository';

const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function assertValidOrderStatusTransition(
  current: OrderStatus,
  next: OrderStatus,
): void {
  const allowed = ALLOWED_STATUS_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition order from ${current} to ${next}.`,
    );
  }
}

function toContactlessOrderDto(row: PrivateOrderDbRow): ContactlessOrder {
  return {
    id: row.id,
    orderBusinessId: row.business_id,
    paymentTransactionId: row.payment_transaction_id,
    orderNumber: row.order_number,
    outletId: row.outlet_id,
    outletBusinessId: row.outlet_business_id,
    outletName: row.outlet_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    tableOrToken: row.table_or_token,
    items: row.items,
    subtotal: Number(Number(row.subtotal).toFixed(2)),
    tax: Number(Number(row.tax).toFixed(2)),
    totalAmount: Number(Number(row.total_amount).toFixed(2)),
    paymentProvider: row.payment_provider,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    paymentReference: row.payment_reference,
    orderStatus: row.order_status,
    notes: row.notes,
    createdAt: toUTCISOString(row.created_at),
    updatedAt: toUTCISOString(row.updated_at),
  };
}

async function resolveScopedOutletId(
  user: AuthenticatedStaffUser,
  requestedOutletBusinessId?: string,
): Promise<string | null> {
  if (user.role === 'OUTLET_STAFF') {
    if (requestedOutletBusinessId) {
      assertOutletBusinessIdScope(user, requestedOutletBusinessId);
    }
    if (!user.outletId) {
      throw new AppError(403, 'NO_ASSIGNED_OUTLET', 'No outlet assigned to staff account.');
    }
    return user.outletId;
  }

  if (!requestedOutletBusinessId) {
    return null;
  }

  const outlet = await findOutletByBusinessId(requestedOutletBusinessId);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }
  return outlet.id;
}

export async function getLiveOrders(
  user: AuthenticatedStaffUser,
  outletBusinessId?: string,
): Promise<ContactlessOrder[]> {
  const scopedOutletId = await resolveScopedOutletId(user, outletBusinessId);
  const rows = await findLiveOrders(scopedOutletId);
  return rows.map(toContactlessOrderDto);
}

export async function getOrderHistory(
  user: AuthenticatedStaffUser,
  queryParams: {
    page: number;
    limit: number;
    outletBusinessId?: string;
    orderStatus?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    fromUtc?: string;
    toUtc?: string;
  },
): Promise<{
  items: ContactlessOrder[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const scopedOutletId = await resolveScopedOutletId(user, queryParams.outletBusinessId);
  const { rows, total } = await findOrderHistory({
    outletId: scopedOutletId,
    orderStatus: queryParams.orderStatus,
    paymentStatus: queryParams.paymentStatus,
    search: queryParams.search,
    fromUtc: queryParams.fromUtc,
    toUtc: queryParams.toUtc,
    page: queryParams.page,
    limit: queryParams.limit,
  });

  return {
    items: rows.map(toContactlessOrderDto),
    pagination: {
      page: queryParams.page,
      limit: queryParams.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / queryParams.limit)),
    },
  };
}

export async function updateOrderStatus(
  user: AuthenticatedStaffUser,
  orderBusinessId: string,
  input: UpdateOrderStatusInput,
): Promise<ContactlessOrder> {
  const order = await findPrivateOrderByBusinessId(orderBusinessId);
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  assertOutletScope(user, order.outlet_id);
  assertValidOrderStatusTransition(order.order_status, input.orderStatus);

  const updated = await updateOrderStatusRow({
    orderId: order.id,
    orderStatus: input.orderStatus,
    notes: input.notes,
  });

  const updatedAtUtc = toUTCISOString(updated.updated_at);
  emitOrderStatusUpdated({
    outletId: order.outlet_id,
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    orderStatus: input.orderStatus,
    paymentStatus: order.payment_status,
    updatedAt: updatedAtUtc,
  });

  void notifyCustomerOrderStatus({
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    orderStatus: input.orderStatus,
    customerPhone: order.customer_phone,
  });

  return {
    ...toContactlessOrderDto(order),
    orderStatus: input.orderStatus,
    notes: input.notes ?? order.notes,
    updatedAt: updatedAtUtc,
  };
}

export async function verifyOrderPayment(
  user: AuthenticatedStaffUser,
  orderBusinessId: string,
  input: VerifyPaymentInput,
): Promise<ContactlessOrder> {
  const order = await findPrivateOrderByBusinessId(orderBusinessId);
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  assertOutletScope(user, order.outlet_id);

  if (order.payment_status !== 'UPI_CLAIMED_DEMO') {
    throw new AppError(
      409,
      'INVALID_PAYMENT_STATE',
      `Only UPI_CLAIMED_DEMO orders can be verified at the counter (current: ${order.payment_status}).`,
    );
  }

  const nextOrderStatus: OrderStatus =
    input.startPreparingImmediately && order.order_status === 'RECEIVED'
      ? 'PREPARING'
      : order.order_status;

  const paymentReference = input.paymentReference?.trim() || `COUNTER-${order.business_id}`;
  const updated = await verifyOrderPaymentRow({
    orderId: order.id,
    paymentReference,
    nextOrderStatus,
  });

  if (!updated) {
    throw new AppError(409, 'INVALID_PAYMENT_STATE', 'Order payment already verified.');
  }

  const verifiedAtUtc = toUTCISOString(updated.updated_at);

  emitOrderPaymentVerified({
    outletId: order.outlet_id,
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    paymentStatus: 'PAID_VERIFIED',
    orderStatus: nextOrderStatus,
    paymentReference,
    verifiedAt: verifiedAtUtc,
  });

  emitOrderStatusUpdated({
    outletId: order.outlet_id,
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    orderStatus: nextOrderStatus,
    paymentStatus: 'PAID_VERIFIED',
    updatedAt: verifiedAtUtc,
  });

  void notifyCustomerPaymentVerified({
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    orderStatus: nextOrderStatus,
    customerPhone: order.customer_phone,
  });

  return {
    ...toContactlessOrderDto(order),
    paymentStatus: 'PAID_VERIFIED',
    paymentReference,
    orderStatus: nextOrderStatus,
    updatedAt: verifiedAtUtc,
  };
}
