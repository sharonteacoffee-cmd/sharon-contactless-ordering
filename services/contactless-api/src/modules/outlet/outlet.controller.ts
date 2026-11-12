import type { NextFunction, Request, Response } from 'express';
import type { UpdateOutletSettingsInput } from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import { getOutlets, updateOutletSettings } from './outlet.service';

export async function handleGetOutlets(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const outlets = await getOutlets();
    sendSuccess(res, 200, 'Outlets fetched successfully', outlets);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateOutletSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateOutletSettingsInput;
    const updated = await updateOutletSettings(req.params.outletBusinessId, body);
    sendSuccess(res, 200, 'Outlet settings updated successfully', updated);
  } catch (err) {
    next(err);
  }
}
