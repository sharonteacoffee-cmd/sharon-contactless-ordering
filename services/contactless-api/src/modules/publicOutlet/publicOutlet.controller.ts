import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getPublicOutletBySlug, getPublicOutlets } from './publicOutlet.service';

export async function handleGetPublicOutlets(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const outlets = await getPublicOutlets();
    sendSuccess(res, 200, 'Public outlets fetched successfully', outlets);
  } catch (err) {
    next(err);
  }
}

export async function handleGetPublicOutletBySlug(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const outletSlug = req.params.outletSlug;
    const qrToken = typeof req.query.qr === 'string' ? req.query.qr : undefined;
    const outlet = await getPublicOutletBySlug(outletSlug, qrToken);
    sendSuccess(res, 200, 'Outlet details fetched successfully', outlet);
  } catch (err) {
    next(err);
  }
}
