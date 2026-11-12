import type { NextFunction, Request, Response } from 'express';
import type { CreatePublicOrderInput, SubmitDemoPaymentInput } from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import {
  createPublicOrder,
  getPublicOrderById,
  submitDemoPayment,
} from './publicOrder.service';

export async function handleCreatePublicOrder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CreatePublicOrderInput;
    const order = await createPublicOrder(body);
    sendSuccess(res, 201, 'Order created. Complete UPI payment to confirm.', order);
  } catch (err) {
    next(err);
  }
}

export async function handleSubmitDemoPayment(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderBusinessId } = req.params;
    const body = req.body as SubmitDemoPaymentInput;
    const result = await submitDemoPayment(orderBusinessId, body);
    sendSuccess(res, 200, 'Payment claim submitted for counter verification.', result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetPublicOrderById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderBusinessId } = req.params;
    const order = await getPublicOrderById(orderBusinessId);
    sendSuccess(res, 200, 'Order status fetched successfully', order);
  } catch (err) {
    next(err);
  }
}
