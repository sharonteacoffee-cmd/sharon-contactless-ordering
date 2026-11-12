import type { NextFunction, Request, Response } from 'express';
import type { ToggleStockInput } from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/appError';
import { getOutletStock, toggleOutletStock } from './outletStock.service';

export async function handleGetOutletStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const items = await getOutletStock(req.user, req.params.outletBusinessId);
    sendSuccess(res, 200, 'Outlet stock fetched successfully', items);
  } catch (err) {
    next(err);
  }
}

export async function handleToggleOutletStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required.');
    }
    const body = req.body as ToggleStockInput;
    const updated = await toggleOutletStock(
      req.user,
      req.params.outletBusinessId,
      req.params.menuItemId,
      body,
    );
    sendSuccess(res, 200, 'Outlet item availability updated successfully', updated);
  } catch (err) {
    next(err);
  }
}
