import type { NextFunction, Request, Response } from 'express';
import type {
  OrderStatus,
  PaymentStatus,
  UpdateOrderStatusInput,
  VerifyPaymentInput,
} from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import {
  getLiveOrders,
  getOrderHistory,
  updateOrderStatus,
  verifyOrderPayment,
} from './orderManagement.service';

export async function handleGetLiveOrders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const outletBusinessId =
      typeof req.query.outletBusinessId === 'string'
        ? req.query.outletBusinessId
        : undefined;
    const completedLimit =
      typeof req.query.completedLimit === 'number'
        ? req.query.completedLimit
        : undefined;
    const orders = await getLiveOrders(req.user, outletBusinessId, completedLimit);
    sendSuccess(res, 200, 'Live orders fetched successfully', orders);
  } catch (err) {
    next(err);
  }
}

export async function handleGetOrderHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const q = req.query as unknown as {
      page: number;
      limit: number;
      outletBusinessId?: string;
      orderStatus?: OrderStatus;
      paymentStatus?: PaymentStatus;
      search?: string;
      fromUtc?: string;
      toUtc?: string;
    };
    const history = await getOrderHistory(req.user, q);
    sendSuccess(res, 200, 'Order history fetched successfully', history);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const body = req.body as UpdateOrderStatusInput;
    const updated = await updateOrderStatus(
      req.user,
      req.params.orderBusinessId,
      body,
    );
    sendSuccess(res, 200, 'Order status updated successfully', updated);
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyOrderPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const body = req.body as VerifyPaymentInput;
    const updated = await verifyOrderPayment(
      req.user,
      req.params.orderBusinessId,
      body,
    );
    sendSuccess(res, 200, 'Order payment verified successfully', updated);
  } catch (err) {
    next(err);
  }
}
