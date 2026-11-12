import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getPublicMenuByOutletSlug } from './publicMenu.service';

export async function handleGetPublicMenu(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const menu = await getPublicMenuByOutletSlug(req.params.outletSlug);
    sendSuccess(res, 200, 'Outlet menu fetched successfully', menu);
  } catch (err) {
    next(err);
  }
}
