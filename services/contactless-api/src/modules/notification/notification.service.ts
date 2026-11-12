import type {
  OrderStatus,
  PushNotificationStatus,
  RegisterCustomerPushTokenInput,
  RegisterPushTokenResult,
  RegisterStaffPushTokenInput,
  UnregisterPushTokenInput,
} from '@sharon/shared';
import { isFirebaseAdminConfigured } from '../../config/firebase.config';
import { generatePushTokenBusinessId } from '../../database/businessIdGenerator';
import { withTransaction } from '../../database/connection';
import type { AuthenticatedStaffUser } from '../../types/auth.types';
import { AppError } from '../../utils/appError';
import { sendFcmMulticast } from './fcmDispatcher';
import { toPushNotificationStatus, toRegisterPushTokenResult } from './notification.dto';
import {
  countActiveStaffPushDevices,
  deactivateCustomerPushToken,
  deactivateStaffPushToken,
  findActiveCustomerPushTokens,
  findActiveStaffPushTokensForOutlet,
  findOrderContextForPush,
  findOutletByBusinessIdForPush,
  findOutletIdBySlugForPush,
  findOutletNameByIdForPush,
  upsertPushNotificationToken,
} from './notification.repository';

function buildOrderStatusPushCopy(
  orderNumber: string,
  orderStatus: OrderStatus,
): { title: string; body: string } {
  switch (orderStatus) {
    case 'PREPARING':
      return {
        title: `Order ${orderNumber} is Being Prepared`,
        body: 'Our baristas have started brewing your Sharon order.',
      };
    case 'READY':
      return {
        title: `Order ${orderNumber} is Ready for Pickup!`,
        body: 'Please collect your freshly brewed order from the pickup counter.',
      };
    case 'COMPLETED':
      return {
        title: `Order ${orderNumber} Completed`,
        body: 'Thank you for visiting Sharon Tea & Coffee!',
      };
    case 'CANCELLED':
      return {
        title: `Order ${orderNumber} Cancelled`,
        body: 'Your order was cancelled. Please check with the counter for assistance.',
      };
    case 'RECEIVED':
    default:
      return {
        title: `Order ${orderNumber} Received`,
        body: 'Your order has been received by the outlet.',
      };
  }
}

export async function registerCustomerPushDevice(
  input: RegisterCustomerPushTokenInput,
  customer?: { customerId: string; phone: string },
): Promise<RegisterPushTokenResult> {
  let outletId: string | null = null;
  let customerId: string | null = customer?.customerId ?? null;
  let customerPhone: string | null = customer?.phone ?? null;
  let orderBusinessId: string | null = null;

  if (input.orderBusinessId) {
    const order = await findOrderContextForPush(input.orderBusinessId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
    }
    outletId = order.outlet_id;
    orderBusinessId = order.business_id;
    customerId = customerId ?? order.customer_id ?? null;
    customerPhone = customerPhone ?? order.customer_phone ?? null;
  } else if (input.outletSlug) {
    const resolvedOutletId = await findOutletIdBySlugForPush(input.outletSlug);
    if (!resolvedOutletId) {
      throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
    }
    outletId = resolvedOutletId;
  }

  const row = await withTransaction(async (client) => {
    const tokenBusinessId = await generatePushTokenBusinessId(client);
    return upsertPushNotificationToken(client, {
      businessId: tokenBusinessId,
      fcmToken: input.fcmToken,
      targetRole: 'CUSTOMER',
      userId: null,
      outletId,
      customerId,
      customerPhone,
      orderBusinessId,
      platform: 'WEB_PWA',
    });
  });

  return toRegisterPushTokenResult(row, isFirebaseAdminConfigured());
}

export async function unregisterCustomerPushDevice(
  input: UnregisterPushTokenInput,
): Promise<void> {
  await deactivateCustomerPushToken(input.fcmToken);
}

export async function registerStaffPushDevice(
  user: AuthenticatedStaffUser,
  input: RegisterStaffPushTokenInput,
): Promise<RegisterPushTokenResult> {
  let outletId: string | null = null;

  if (user.role === 'OUTLET_STAFF') {
    if (input.outletBusinessId && input.outletBusinessId !== user.outletBusinessId) {
      throw new AppError(
        403,
        'FORBIDDEN_OUTLET_SCOPE',
        'You do not have access to register notifications for this outlet.',
      );
    }
    if (!user.outletId) {
      throw new AppError(403, 'OUTLET_NOT_ASSIGNED', 'Staff account has no assigned outlet.');
    }
    outletId = user.outletId;
  } else if (input.outletBusinessId) {
    const outlet = await findOutletByBusinessIdForPush(input.outletBusinessId);
    if (!outlet) {
      throw new AppError(404, 'OUTLET_NOT_FOUND', 'Outlet not found.');
    }
    outletId = outlet.id;
  }

  const row = await withTransaction(async (client) => {
    const tokenBusinessId = await generatePushTokenBusinessId(client);
    return upsertPushNotificationToken(client, {
      businessId: tokenBusinessId,
      fcmToken: input.fcmToken,
      targetRole: 'STAFF',
      userId: user.userId,
      outletId,
      customerId: null,
      customerPhone: null,
      orderBusinessId: null,
      platform: 'WEB_PWA',
    });
  });

  return toRegisterPushTokenResult(row, isFirebaseAdminConfigured());
}

export async function unregisterStaffPushDevice(
  user: AuthenticatedStaffUser,
  input: UnregisterPushTokenInput,
): Promise<void> {
  await deactivateStaffPushToken(user.userId, input.fcmToken);
}

export async function getStaffPushStatus(
  user: AuthenticatedStaffUser,
): Promise<PushNotificationStatus> {
  const activeDeviceCount = await countActiveStaffPushDevices(user.userId);
  return toPushNotificationStatus(isFirebaseAdminConfigured(), activeDeviceCount);
}

export async function notifyStaffNewOrder(params: {
  outletId: string;
  orderBusinessId: string;
  orderNumber: string;
  totalAmount: number;
}): Promise<void> {
  if (!isFirebaseAdminConfigured()) {
    return;
  }
  try {
    const tokens = await findActiveStaffPushTokensForOutlet(params.outletId);
    if (tokens.length === 0) {
      return;
    }
    const outletName = await findOutletNameByIdForPush(params.outletId);
    await sendFcmMulticast(tokens, {
      title: `New Order ${params.orderNumber}`,
      body: `${outletName ?? 'Sharon Outlet'} • INR ${params.totalAmount.toFixed(2)}`,
      link: '/kds',
      requireInteraction: true,
      data: {
        type: 'NEW_ORDER',
        orderBusinessId: params.orderBusinessId,
        orderNumber: params.orderNumber,
      },
    });
  } catch (err) {
    console.warn('[push] Failed to dispatch staff new-order push:', err);
  }
}

export async function notifyCustomerOrderStatus(params: {
  orderBusinessId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  customerId?: string | null;
  customerPhone?: string | null;
}): Promise<void> {
  if (!isFirebaseAdminConfigured()) {
    return;
  }
  try {
    const orderCtx =
      params.customerId === undefined && params.customerPhone === undefined
        ? await findOrderContextForPush(params.orderBusinessId)
        : null;

    const tokens = await findActiveCustomerPushTokens({
      orderBusinessId: params.orderBusinessId,
      customerId: params.customerId ?? orderCtx?.customer_id ?? null,
      customerPhone: params.customerPhone ?? orderCtx?.customer_phone ?? null,
    });
    if (tokens.length === 0) {
      return;
    }

    const copy = buildOrderStatusPushCopy(params.orderNumber, params.orderStatus);
    await sendFcmMulticast(tokens, {
      title: copy.title,
      body: copy.body,
      link: `/track/${params.orderBusinessId}`,
      data: {
        type: 'ORDER_STATUS',
        orderBusinessId: params.orderBusinessId,
        orderNumber: params.orderNumber,
        orderStatus: params.orderStatus,
      },
    });
  } catch (err) {
    console.warn('[push] Failed to dispatch customer status push:', err);
  }
}

export async function notifyCustomerPaymentVerified(params: {
  orderBusinessId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  customerId?: string | null;
  customerPhone?: string | null;
}): Promise<void> {
  if (!isFirebaseAdminConfigured()) {
    return;
  }
  try {
    const orderCtx =
      params.customerId === undefined && params.customerPhone === undefined
        ? await findOrderContextForPush(params.orderBusinessId)
        : null;

    const tokens = await findActiveCustomerPushTokens({
      orderBusinessId: params.orderBusinessId,
      customerId: params.customerId ?? orderCtx?.customer_id ?? null,
      customerPhone: params.customerPhone ?? orderCtx?.customer_phone ?? null,
    });
    if (tokens.length === 0) {
      return;
    }

    await sendFcmMulticast(tokens, {
      title: `Payment Verified for ${params.orderNumber}`,
      body: 'Your payment is confirmed and our kitchen has your order.',
      link: `/track/${params.orderBusinessId}`,
      data: {
        type: 'PAYMENT_VERIFIED',
        orderBusinessId: params.orderBusinessId,
        orderNumber: params.orderNumber,
        orderStatus: params.orderStatus,
      },
    });
  } catch (err) {
    console.warn('[push] Failed to dispatch customer payment-verified push:', err);
  }
}
