import {
  toUTCISOString,
  type OrderLineItem,
  type OrderStatus,
  type PaymentProvider,
  type PaymentStatus,
} from '@sharon/shared';
import { withTransaction } from '../../database/connection';
import {
  emitNewOrder,
  emitOrderPaymentVerified,
  emitOrderStatusUpdated,
} from '../../socket/socketBroadcaster';
import { getPaymentStrategy } from '../../strategies/payment/paymentStrategy.factory';
import { AppError } from '../../utils/appError';
import {
  notifyCustomerPaymentVerified,
  notifyStaffNewOrder,
} from '../notification/notification.service';

interface WebhookOrderRow {
  id: string;
  business_id: string;
  order_number: string;
  outlet_id: string;
  outlet_business_id: string;
  customer_name: string;
  table_or_token: string | null;
  items: OrderLineItem[];
  total_amount: string;
  payment_provider: PaymentProvider;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  created_at: Date;
}

function normalizeProvider(providerParam: string): 'RAZORPAY' | 'CASHFREE' {
  const upper = providerParam.trim().toUpperCase();
  if (upper === 'RAZORPAY' || upper === 'CASHFREE') {
    return upper;
  }
  throw new AppError(
    400,
    'UNSUPPORTED_WEBHOOK_PROVIDER',
    'Unsupported payment webhook provider.',
  );
}

export async function processPaymentWebhook(input: {
  providerParam: string;
  rawBody: Buffer | string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}): Promise<{ processed: boolean; orderBusinessId?: string; paymentStatus?: PaymentStatus }> {
  const provider = normalizeProvider(input.providerParam);
  const strategy = getPaymentStrategy(provider);

  const isSignatureValid = strategy.verifyWebhookSignature(input.rawBody, input.headers);
  if (!isSignatureValid) {
    throw new AppError(401, 'INVALID_WEBHOOK_SIGNATURE', 'Invalid webhook signature.');
  }

  const parsed = strategy.parseWebhookPayload(input.body);
  if (!parsed || !parsed.isPaidEvent) {
    return { processed: false };
  }

  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query<WebhookOrderRow>(
      `SELECT o.id, o.business_id, o.order_number, o.outlet_id,
              out.business_id AS outlet_business_id,
              o.customer_name, o.table_or_token, o.items, o.total_amount::text AS total_amount,
              o.payment_provider, o.payment_status, o.order_status, o.notes, o.created_at
       FROM orders o
       INNER JOIN outlets out ON out.id = o.outlet_id
       WHERE o.business_id = $1
       FOR UPDATE OF o`,
      [parsed.orderBusinessId],
    );

    const order = rows[0];
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order referenced in webhook not found.');
    }

    if (order.payment_status === 'PAID_VERIFIED') {
      return { alreadyVerified: true as const, order };
    }

    if (
      parsed.amountInRupees !== undefined &&
      Math.abs(Number(order.total_amount) - parsed.amountInRupees) > 0.01
    ) {
      throw new AppError(
        409,
        'PAYMENT_AMOUNT_MISMATCH',
        'Webhook payment amount does not match order total.',
      );
    }

    const nextOrderStatus: OrderStatus =
      order.order_status === 'RECEIVED' ? 'PREPARING' : order.order_status;

    const updated = await client.query<{ updated_at: Date }>(
      `UPDATE orders
       SET payment_status = 'PAID_VERIFIED',
           payment_reference = $2,
           order_status = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING updated_at`,
      [order.id, parsed.paymentReference, nextOrderStatus],
    );

    return {
      alreadyVerified: false as const,
      wasPending: order.payment_status === 'PAYMENT_PENDING',
      nextOrderStatus,
      updatedAt: updated.rows[0].updated_at,
      order,
    };
  });

  if (outcome.alreadyVerified) {
    return {
      processed: true,
      orderBusinessId: outcome.order.business_id,
      paymentStatus: 'PAID_VERIFIED',
    };
  }

  const verifiedAtUtc = toUTCISOString(outcome.updatedAt);

  if (outcome.wasPending) {
    emitNewOrder({
      outletId: outcome.order.outlet_id,
      outletBusinessId: outcome.order.outlet_business_id,
      orderBusinessId: outcome.order.business_id,
      orderNumber: outcome.order.order_number,
      customerName: outcome.order.customer_name,
      tableOrToken: outcome.order.table_or_token,
      items: outcome.order.items,
      totalAmount: Number(Number(outcome.order.total_amount).toFixed(2)),
      paymentProvider: outcome.order.payment_provider,
      paymentStatus: 'PAID_VERIFIED',
      orderStatus: outcome.nextOrderStatus,
      notes: outcome.order.notes,
      createdAt: toUTCISOString(outcome.order.created_at),
    });

    void notifyStaffNewOrder({
      outletId: outcome.order.outlet_id,
      orderBusinessId: outcome.order.business_id,
      orderNumber: outcome.order.order_number,
      totalAmount: Number(Number(outcome.order.total_amount).toFixed(2)),
    });
  }

  emitOrderPaymentVerified({
    outletId: outcome.order.outlet_id,
    orderBusinessId: outcome.order.business_id,
    orderNumber: outcome.order.order_number,
    paymentStatus: 'PAID_VERIFIED',
    orderStatus: outcome.nextOrderStatus,
    paymentReference: parsed.paymentReference,
    verifiedAt: verifiedAtUtc,
  });

  emitOrderStatusUpdated({
    outletId: outcome.order.outlet_id,
    orderBusinessId: outcome.order.business_id,
    orderNumber: outcome.order.order_number,
    orderStatus: outcome.nextOrderStatus,
    paymentStatus: 'PAID_VERIFIED',
    updatedAt: verifiedAtUtc,
  });

  void notifyCustomerPaymentVerified({
    orderBusinessId: outcome.order.business_id,
    orderNumber: outcome.order.order_number,
    orderStatus: outcome.nextOrderStatus,
  });

  return {
    processed: true,
    orderBusinessId: outcome.order.business_id,
    paymentStatus: 'PAID_VERIFIED',
  };
}
