import type {
  RegisterCustomerPushTokenInput,
  RegisterStaffPushTokenInput,
  UnregisterPushTokenInput,
} from '@sharon/shared';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../../config/auth.config';
import type { CustomerSessionJwtPayload } from '../../middleware/authenticateCustomer.middleware';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import {
  getStaffPushStatus,
  registerCustomerPushDevice,
  registerStaffPushDevice,
  unregisterCustomerPushDevice,
  unregisterStaffPushDevice,
} from './notification.service';

function tryExtractOptionalCustomer(
  req: Request,
): { customerId: string; phone: string } | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return undefined;
  }

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret, {
      algorithms: ['HS256'],
    }) as Partial<CustomerSessionJwtPayload>;

    if (
      decoded.purpose === 'CUSTOMER_SESSION' &&
      decoded.customerId &&
      decoded.phone
    ) {
      return {
        customerId: decoded.customerId,
        phone: decoded.phone,
      };
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function handleRegisterCustomerDevice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as RegisterCustomerPushTokenInput;
    const customer = tryExtractOptionalCustomer(req);
    const result = await registerCustomerPushDevice(input, customer);
    sendSuccess(res, 200, 'Customer device registered for push notifications', result);
  } catch (err) {
    next(err);
  }
}

export async function handleUnregisterCustomerDevice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as UnregisterPushTokenInput;
    await unregisterCustomerPushDevice(input);
    sendSuccess(res, 200, 'Customer device unregistered from push notifications', {
      unregistered: true,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleRegisterStaffDevice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const input = req.body as RegisterStaffPushTokenInput;
    const result = await registerStaffPushDevice(req.user, input);
    sendSuccess(res, 200, 'Staff device registered for push notifications', result);
  } catch (err) {
    next(err);
  }
}

export async function handleUnregisterStaffDevice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const input = req.body as UnregisterPushTokenInput;
    await unregisterStaffPushDevice(req.user, input);
    sendSuccess(res, 200, 'Staff device unregistered from push notifications', {
      unregistered: true,
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetPushStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const status = await getStaffPushStatus(req.user);
    sendSuccess(res, 200, 'Push notification status fetched successfully', status);
  } catch (err) {
    next(err);
  }
}
