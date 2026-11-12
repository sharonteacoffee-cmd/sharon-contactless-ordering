import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../utils/appError';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: Array<{ field: string; message: string }> = [];

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            field: issue.path.join('.') || 'params',
            message: issue.message,
          });
        }
      } else {
        req.params = result.data as Record<string, string>;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            field: issue.path.join('.') || 'query',
            message: issue.message,
          });
        }
      } else {
        req.query = result.data as Request['query'];
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            field: issue.path.join('.') || 'body',
            message: issue.message,
          });
        }
      } else {
        req.body = result.data;
      }
    }

    if (details.length > 0) {
      next(
        new AppError(
          422,
          'VALIDATION_ERROR',
          details[0]?.message ?? 'Request validation failed.',
          details,
        ),
      );
      return;
    }

    next();
  };
}
