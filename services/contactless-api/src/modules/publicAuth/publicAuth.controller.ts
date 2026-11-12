import type { NextFunction, Request, Response } from 'express';
import type { SendCustomerOtpInput, VerifyCustomerOtpInput } from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import { sendCustomerOtp, verifyCustomerOtp } from './publicAuth.service';

export async function handleSendCustomerOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as SendCustomerOtpInput;
    const result = await sendCustomerOtp(body);
    sendSuccess(res, 200, 'OTP sent successfully', result);
  } catch (err) {
    next(err);
  }
}

export async function handleVerifyCustomerOtp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as VerifyCustomerOtpInput;
    const result = await verifyCustomerOtp(body);
    sendSuccess(res, 200, 'OTP verified successfully', result);
  } catch (err) {
    next(err);
  }
}
