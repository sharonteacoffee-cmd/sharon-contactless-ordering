import type { NextFunction, Request, Response } from 'express';
import type { StaffLoginInput } from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import { getStaffProfileById, loginStaffUser } from './auth.service';

export async function handleStaffLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as StaffLoginInput;
    const result = await loginStaffUser(body);
    sendSuccess(res, 200, 'Login successful', result);
  } catch (err) {
    next(err);
  }
}

export async function handleGetCurrentProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const profile = await getStaffProfileById(req.user.userId);
    sendSuccess(res, 200, 'Staff profile fetched successfully', profile);
  } catch (err) {
    next(err);
  }
}
