import type { NextFunction, Request, Response } from 'express';
import { appConfig } from '../config/app.config';
import { sendError } from '../utils/apiResponse';
import { AppError } from '../utils/appError';

export function notFoundMiddleware(req: Request, res: Response): void {
  sendError(res, 404, 'ROUTE_NOT_FOUND', `Endpoint ${req.method} ${req.originalUrl} not found.`);
}

export function errorHandlerMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', 'Malformed JSON request body.');
    return;
  }

  if (!appConfig.isProduction) {
    console.error('[errorHandler] Unhandled error:', err);
  } else {
    const safeMessage = err instanceof Error ? err.message : 'Unknown internal error';
    console.error('[errorHandler] Unhandled error:', safeMessage);
  }

  // Never leak stack traces, SQL errors, or internal implementation details
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'Something went wrong. Please try again.');
}
