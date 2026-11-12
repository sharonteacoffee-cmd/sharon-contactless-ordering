import type { NextFunction, Request, Response } from 'express';
import type {
  LookupCustomerByPhoneInput,
  SaveCustomerProfileInput,
  SendCustomerLoginOtpInput,
  UpdateCustomerProfileInput,
  VerifyCustomerLoginOtpInput,
} from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import {
  getMyCustomerOrders,
  getMyCustomerProfile,
  lookupCustomerByPhone,
  saveCustomerProfile,
  sendCustomerLoginOtp,
  updateMyCustomerProfile,
  verifyCustomerLoginOtp,
} from './publicCustomer.service';

export async function handleLookupCustomerByPhone(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const queryParams = req.query as unknown as LookupCustomerByPhoneInput;
    const result = await lookupCustomerByPhone(queryParams);
    sendSuccess(res, 200, 'Customer lookup complete', result);
  } catch (err) {
    next(err);
  }
}

export async function handleSaveCustomerProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as SaveCustomerProfileInput;
    const profile = await saveCustomerProfile(body);
    sendSuccess(res, 200, 'Customer profile saved successfully', profile);
  } catch (err) {
    next(err);
  }
}

export async function handleSendCustomerLoginOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as SendCustomerLoginOtpInput;
    const result = await sendCustomerLoginOtp(body);
    sendSuccess(res, 200, 'Login OTP sent successfully', result);
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyCustomerLoginOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as VerifyCustomerLoginOtpInput;
    const result = await verifyCustomerLoginOtp(body);
    sendSuccess(res, 200, 'Customer signed in successfully', result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetMyCustomerProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.customer) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer authentication required.');
    }
    const profile = await getMyCustomerProfile(req.customer.customerId);
    sendSuccess(res, 200, 'Customer profile fetched successfully', profile);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateMyCustomerProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.customer) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer authentication required.');
    }
    const body = req.body as UpdateCustomerProfileInput;
    const profile = await updateMyCustomerProfile(req.customer.customerId, body);
    sendSuccess(res, 200, 'Customer profile updated successfully', profile);
  } catch (err) {
    next(err);
  }
}

export async function handleGetMyCustomerOrders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.customer) {
      throw new AppError(401, 'UNAUTHORIZED', 'Customer authentication required.');
    }
    const orders = await getMyCustomerOrders(
      req.customer.customerId,
      req.customer.phone,
    );
    sendSuccess(res, 200, 'Customer orders fetched successfully', orders);
  } catch (err) {
    next(err);
  }
}
