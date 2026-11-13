import type { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { uploadService } from './upload.service';

export async function handleUploadImage(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await uploadService.uploadImage(req.file);
    sendSuccess(res, 201, 'Image uploaded successfully', result);
  } catch (err) {
    next(err);
  }
}
