import type { NextFunction, Request, Response } from 'express';
import type { GenerateQrInput, UpdateQrStatusInput } from '@sharon/shared';
import { sendSuccess } from '../../utils/apiResponse';
import {
  generateQrCode,
  getAllQrCodes,
  updateQrStatus,
} from './qrMaster.service';

export async function handleGetQrCodes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const outletBusinessId =
      typeof req.query.outletBusinessId === 'string'
        ? req.query.outletBusinessId
        : undefined;
    const codes = await getAllQrCodes(outletBusinessId);
    sendSuccess(res, 200, 'QR codes fetched successfully', codes);
  } catch (err) {
    next(err);
  }
}

export async function handleGenerateQrCode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as GenerateQrInput;
    const created = await generateQrCode(body);
    sendSuccess(res, 201, 'QR code generated successfully', created);
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateQrStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as UpdateQrStatusInput;
    const updated = await updateQrStatus(req.params.qrBusinessId, body);
    sendSuccess(res, 200, 'QR code status updated successfully', updated);
  } catch (err) {
    next(err);
  }
}
