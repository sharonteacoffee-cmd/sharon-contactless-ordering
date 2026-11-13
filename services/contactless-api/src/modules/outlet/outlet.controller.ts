import type { NextFunction, Request, Response } from 'express';
import type {
  CreateOutletInput,
  UpdateOutletFullInput,
  UpdateOutletSettingsInput,
} from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import {
  createOutlet,
  deleteOutlet,
  getOutlets,
  updateOutlet,
  updateOutletSettings,
} from './outlet.service';

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

export async function handleCreateOutlet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CreateOutletInput;
    const created = await createOutlet(body);
    sendSuccess(res, 201, 'Outlet created successfully', created);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateOutlet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateOutletFullInput;
    const updated = await updateOutlet(req.params.outletBusinessId, body);
    sendSuccess(res, 200, 'Outlet updated successfully', updated);
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
    const updated = await updateOutletSettings(
      req.params.outletBusinessId,
      body,
    );
    sendSuccess(res, 200, 'Outlet settings updated successfully', updated);
  } catch (err) {
    next(err);
  }
}

export async function handleDeleteOutlet(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await deleteOutlet(req.params.outletBusinessId);
    sendSuccess(
      res,
      200,
      result.deleted
        ? 'Outlet deleted successfully'
        : 'Outlet deactivated successfully',
      result,
    );
  } catch (err) {
    next(err);
  }
}
