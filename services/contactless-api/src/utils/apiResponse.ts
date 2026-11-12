import type { Response } from 'express';
import {
  toUTCISOString,
  type ApiErrorDetail,
  type ApiErrorEnvelope,
  type ApiSuccessEnvelope,
} from '@sharon/shared';

export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T,
): Response<ApiSuccessEnvelope<T>> {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestampUtc: toUTCISOString(new Date()),
  });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: ApiErrorDetail[],
): Response<ApiErrorEnvelope> {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
    timestampUtc: toUTCISOString(new Date()),
  });
}
