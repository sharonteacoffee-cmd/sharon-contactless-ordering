import {
  toUTCISOString,
  type CreatePublicOrderInput,
  type OrderLineItem,
  type SelectedModifier,
  type SubmitDemoPaymentInput,
  type OrderTrackingInfo,
} from '@sharon/shared';
import {
  generateNextBusinessId,
  generateNextOutletOrderNumber,
} from '../../database/businessIdGenerator';
import { withTransaction } from '../../database/connection';
import {
  emitNewOrder,
  emitOrderPaymentVerified,
  emitOrderStatusUpdated,
} from '../../socket/socketBroadcaster';
import { buildDynamicUpiPayload } from '../../strategies/payment/demoUpiPayment.strategy';
import { getPaymentStrategy } from '../../strategies/payment/paymentStrategy.factory';
import { AppError } from '../../utils/appError';
import {
  notifyCustomerPaymentVerified,
  notifyStaffNewOrder,
} from '../notification/notification.service';
import { verifyCustomerOtpToken } from '../publicAuth/publicAuth.service';
import { upsertCustomerProfile } from '../publicCustomer/publicCustomer.repository';
import { findOutletBySlug } from '../publicOutlet/publicOutlet.repository';
import {
  toPublicOrderTrackingDto,
  type CreatePublicOrderResponseDto,
} from './publicOrder.dto';
import {
  autoVerifyDemoOrder,
  findModifierOptionsForOrder,
  findOutletMenuItemsForOrder,
  findPublicOrderJoinedByBusinessId,
  insertOrder,
  updateOrderToDemoClaimed,
  type ModifierOptionJoinedRow,
  type PricedMenuItemRow,
} from './publicOrder.repository';

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Pure server-side pricing engine used inside transactions and unit tests.
 * Never trusts client-supplied unit prices, totals, or payment flags.
 */
export function calculateServerOrderLines(
  requestedItems: CreatePublicOrderInput['items'],
  menuItemsById: Map<string, PricedMenuItemRow>,
  modifierOptionsById: Map<string, ModifierOptionJoinedRow>,
): { lineItems: OrderLineItem[]; subtotal: number; tax: number; totalAmount: number } {
  const lineItems: OrderLineItem[] = [];
  let subtotal = 0;

  for (const reqItem of requestedItems) {
    const dbItem = menuItemsById.get(reqItem.menuItemId);
    if (!dbItem || !dbItem.is_active) {
      throw new AppError(404, 'MENU_ITEM_NOT_FOUND', 'One or more selected menu items no longer exist.');
    }

    if (!dbItem.is_available) {
      throw new AppError(
        409,
        'ITEM_OUT_OF_STOCK',
        `${dbItem.name} is currently sold out at this outlet.`,
      );
    }

    const uniqueOptionIds = Array.from(new Set(reqItem.selectedModifierOptionIds));
    const groupCounts = new Map<string, { name: string; count: number; max: number }>();
    const selectedModifiers: SelectedModifier[] = [];
    let modifiersTotal = 0;

    for (const optionId of uniqueOptionIds) {
      const mod = modifierOptionsById.get(optionId);
      if (!mod) {
        throw new AppError(422, 'INVALID_MODIFIER_OPTION', 'One or more selected modifiers are invalid.');
      }

      const prev = groupCounts.get(mod.group_id) ?? {
        name: mod.group_name,
        count: 0,
        max: mod.max_selection,
      };
      prev.count += 1;
      if (prev.count > prev.max) {
        throw new AppError(
          422,
          'MODIFIER_LIMIT_EXCEEDED',
          `Too many options selected for ${prev.name}.`,
        );
      }
      groupCounts.set(mod.group_id, prev);

      const priceExtra = roundCurrency(Number(mod.price_extra));
      modifiersTotal = roundCurrency(modifiersTotal + priceExtra);
      selectedModifiers.push({
        groupId: mod.group_id,
        groupName: mod.group_name,
        optionId: mod.option_id,
        optionName: mod.option_name,
        priceExtra,
      });
    }

    const unitPrice = roundCurrency(
      dbItem.custom_price !== null ? Number(dbItem.custom_price) : Number(dbItem.base_price),
    );
    const lineTotal = roundCurrency((unitPrice + modifiersTotal) * reqItem.quantity);
    subtotal = roundCurrency(subtotal + lineTotal);

    lineItems.push({
      menuItemId: dbItem.id,
      name: dbItem.name,
      quantity: reqItem.quantity,
      unitPrice,
      modifiersTotal,
      lineTotal,
      selectedModifiers,
    });
  }

  const tax = 0;
  const totalAmount = roundCurrency(subtotal + tax);
  return { lineItems, subtotal, tax, totalAmount };
}

export async function createPublicOrder(
  input: CreatePublicOrderInput,
): Promise<CreatePublicOrderResponseDto> {
  const outlet = await findOutletBySlug(input.outletSlug);
  if (!outlet) {
    throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
  }

  if (!outlet.is_ordering_enabled) {
    throw new AppError(
      409,
      'OUTLET_ORDERING_PAUSED',
      'Online ordering is temporarily paused at this outlet.',
    );
  }

  const customerName = input.customerName?.trim() ?? '';
  const customerPhone = input.customerPhone?.trim() ?? '';

  if (outlet.require_customer_name && !customerName) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Customer name is required.', [
      { field: 'customerName', message: 'Customer name is required' },
    ]);
  }

  if (outlet.require_customer_phone && !customerPhone) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Customer mobile number is required.', [
      { field: 'customerPhone', message: 'Customer mobile number is required' },
    ]);
  }

  if (outlet.customer_auth_mode === 'OTP_VERIFIED') {
    if (!input.otpVerificationToken || !customerPhone) {
      throw new AppError(
        401,
        'OTP_VERIFICATION_REQUIRED',
        'Mobile OTP verification is required before placing an order at this outlet.',
      );
    }
    verifyCustomerOtpToken(input.otpVerificationToken, outlet.slug, customerPhone);
  }

  const menuItemIds = Array.from(new Set(input.items.map((item) => item.menuItemId)));
  const modifierOptionIds = Array.from(
    new Set(input.items.flatMap((item) => item.selectedModifierOptionIds)),
  );

  const created = await withTransaction(async (client) => {
    const [pricedMenuRows, modifierRows] = await Promise.all([
      findOutletMenuItemsForOrder(client, outlet.id, menuItemIds),
      findModifierOptionsForOrder(client, modifierOptionIds),
    ]);

    const menuItemsById = new Map(pricedMenuRows.map((row) => [row.id, row]));
    const modifierOptionsById = new Map(modifierRows.map((row) => [row.option_id, row]));

    const { lineItems, subtotal, tax, totalAmount } = calculateServerOrderLines(
      input.items,
      menuItemsById,
      modifierOptionsById,
    );

    const [orderBusinessId, paymentTransactionId, orderNumber] = await Promise.all([
      generateNextBusinessId(client, 'ORD'),
      generateNextBusinessId(client, 'TXN'),
      generateNextOutletOrderNumber(client, outlet.id, outlet.slug),
    ]);

    const paymentMethod = outlet.payment_provider === 'DEMO_UPI_INTENT' ? 'UPI' : 'ONLINE';

    let customerId: string | null = null;
    if (/^[6-9]\d{9}$/.test(customerPhone)) {
      const customerBusinessId = await generateNextBusinessId(client, 'CUS');
      const customerRow = await upsertCustomerProfile(client, {
        businessId: customerBusinessId,
        fullName: customerName || 'Sharon Guest',
        phone: customerPhone,
        lastOutletId: outlet.id,
      });
      customerId = customerRow?.id ?? null;
    }

    const inserted = await insertOrder(client, {
      businessId: orderBusinessId,
      paymentTransactionId,
      orderNumber,
      outletId: outlet.id,
      customerId,
      customerName: customerName || 'Walk-in Guest',
      customerPhone: customerPhone || '0000000000',
      tableOrToken: input.tableOrToken?.trim() || null,
      items: lineItems,
      subtotal,
      tax,
      totalAmount,
      paymentProvider: outlet.payment_provider,
      paymentMethod,
      paymentStatus: 'PAYMENT_PENDING',
      orderStatus: 'RECEIVED',
      notes: input.notes?.trim() || null,
    });

    return {
      orderBusinessId,
      paymentTransactionId,
      orderNumber,
      totalAmount,
      createdAt: inserted.created_at,
    };
  });

  const strategy = getPaymentStrategy(outlet.payment_provider);
  const paymentInit = await strategy.initiatePayment({
    orderBusinessId: created.orderBusinessId,
    orderNumber: created.orderNumber,
    totalAmount: created.totalAmount,
    upiVpa: outlet.upi_vpa,
    upiPayeeName: outlet.upi_payee_name,
    customerName: customerName || 'Walk-in Guest',
    customerPhone: customerPhone || '0000000000',
  });

  return {
    orderBusinessId: created.orderBusinessId,
    orderNumber: created.orderNumber,
    paymentTransactionId: created.paymentTransactionId,
    outletName: outlet.name,
    totalAmount: created.totalAmount,
    paymentProvider: outlet.payment_provider,
    paymentStatus: 'PAYMENT_PENDING',
    orderStatus: 'RECEIVED',
    ...(paymentInit.upiPayload ? { upiPayload: paymentInit.upiPayload } : {}),
    ...(paymentInit.gatewayOrderId ? { gatewayOrderId: paymentInit.gatewayOrderId } : {}),
    createdAt: toUTCISOString(created.createdAt),
  };
}

export async function submitDemoPayment(
  orderBusinessId: string,
  _input: SubmitDemoPaymentInput,
): Promise<{
  orderBusinessId: string;
  orderNumber: string;
  paymentStatus: 'UPI_CLAIMED_DEMO';
  orderStatus: 'RECEIVED';
  updatedAt: string;
}> {
  const order = await findPublicOrderJoinedByBusinessId(orderBusinessId);
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  if (order.outlet_payment_provider !== 'DEMO_UPI_INTENT') {
    throw new AppError(
      403,
      'DEMO_PAYMENT_NOT_ALLOWED',
      'Demo UPI confirmation is only allowed for outlets using DEMO_UPI_INTENT.',
    );
  }

  if (order.payment_status !== 'PAYMENT_PENDING') {
    throw new AppError(
      409,
      'INVALID_PAYMENT_STATE',
      `Payment cannot be claimed while status is ${order.payment_status}.`,
    );
  }

  const updated = await updateOrderToDemoClaimed(orderBusinessId);
  if (!updated) {
    throw new AppError(409, 'INVALID_PAYMENT_STATE', 'Order payment status already updated.');
  }

  const updatedAtUtc = toUTCISOString(updated.updated_at);
  const createdAtUtc = toUTCISOString(order.created_at);

  emitNewOrder({
    outletId: order.outlet_id,
    outletBusinessId: order.outlet_business_id,
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    tableOrToken: order.table_or_token,
    items: order.items,
    totalAmount: Number(Number(order.total_amount).toFixed(2)),
    paymentProvider: order.payment_provider,
    paymentStatus: 'UPI_CLAIMED_DEMO',
    orderStatus: order.order_status,
    notes: order.notes,
    createdAt: createdAtUtc,
  });

  emitOrderStatusUpdated({
    outletId: order.outlet_id,
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    orderStatus: order.order_status,
    paymentStatus: 'UPI_CLAIMED_DEMO',
    updatedAt: updatedAtUtc,
  });

  void notifyStaffNewOrder({
    outletId: order.outlet_id,
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    totalAmount: Number(Number(order.total_amount).toFixed(2)),
  });

  if (order.outlet_demo_auto_verify) {
    const timer = setTimeout(() => {
      const demoRef = `DEMO-AUTO-${order.business_id}`;
      void autoVerifyDemoOrder(order.business_id, demoRef)
        .then((autoRow) => {
          if (!autoRow) return;
          const verifiedAt = toUTCISOString(autoRow.updated_at);
          emitOrderPaymentVerified({
            outletId: order.outlet_id,
            orderBusinessId: order.business_id,
            orderNumber: order.order_number,
            paymentStatus: 'PAID_VERIFIED',
            orderStatus: 'PREPARING',
            paymentReference: demoRef,
            verifiedAt,
          });
          emitOrderStatusUpdated({
            outletId: order.outlet_id,
            orderBusinessId: order.business_id,
            orderNumber: order.order_number,
            orderStatus: 'PREPARING',
            paymentStatus: 'PAID_VERIFIED',
            updatedAt: verifiedAt,
          });
          void notifyCustomerPaymentVerified({
            orderBusinessId: order.business_id,
            orderNumber: order.order_number,
            orderStatus: 'PREPARING',
          });
        })
        .catch((err) => {
          console.error('[publicOrder] Demo auto-verify failed:', err);
        });
    }, 3000);
    timer.unref();
  }

  return {
    orderBusinessId: order.business_id,
    orderNumber: order.order_number,
    paymentStatus: 'UPI_CLAIMED_DEMO',
    orderStatus: 'RECEIVED',
    updatedAt: updatedAtUtc,
  };
}

export async function getPublicOrderById(
  orderBusinessId: string,
): Promise<OrderTrackingInfo> {
  const order = await findPublicOrderJoinedByBusinessId(orderBusinessId);
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  }

  const upiPayload =
    order.payment_status === 'PAYMENT_PENDING' &&
    order.payment_provider === 'DEMO_UPI_INTENT'
      ? buildDynamicUpiPayload({
          upiVpa: order.outlet_upi_vpa,
          upiPayeeName: order.outlet_upi_payee_name,
          orderBusinessId: order.business_id,
          orderNumber: order.order_number,
          totalAmount: Number(order.total_amount),
        })
      : undefined;

  return toPublicOrderTrackingDto(order, upiPayload);
}
