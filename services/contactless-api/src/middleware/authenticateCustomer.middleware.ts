import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config/auth.config';
import { AppError } from '../utils/appError';

export interface CustomerSessionJwtPayload {
  purpose: 'CUSTOMER_SESSION';
  customerId: string;
  customerBusinessId: string;
  phone: string;
}

export function authenticateCustomerMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Customer authentication token is required.'));
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Customer authentication token is required.'));
    return;
  }

  try {
    const decoded = jwt.verify(token, authConfig.jwtSecret, {
      algorithms: ['HS256'],
    }) as Partial<CustomerSessionJwtPayload>;

    if (
      decoded.purpose !== 'CUSTOMER_SESSION' ||
      !decoded.customerId ||
      !decoded.customerBusinessId ||
      !decoded.phone
    ) {
      next(new AppError(401, 'INVALID_TOKEN', 'Invalid customer session token.'));
      return;
    }

    req.customer = {
      customerId: decoded.customerId,
      customerBusinessId: decoded.customerBusinessId,
      phone: decoded.phone,
    };
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Customer session expired or invalid.'));
  }
}
