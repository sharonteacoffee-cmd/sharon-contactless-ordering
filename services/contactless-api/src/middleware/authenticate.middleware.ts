import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { StaffRole } from '@sharon/shared';
import { authConfig } from '../config/auth.config';
import { query } from '../database/connection';
import { AppError } from '../utils/appError';

interface StaffJwtPayload {
  userId: string;
  businessId: string;
  role: StaffRole;
  outletId: string | null;
  outletBusinessId: string | null;
  email: string;
  fullName: string;
}

interface ActiveUserRow {
  id: string;
  business_id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  outlet_id: string | null;
  outlet_business_id: string | null;
  is_active: boolean;
}

export async function authenticateMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is required.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication token is required.');
    }

    let decoded: StaffJwtPayload;
    try {
      decoded = jwt.verify(token, authConfig.jwtSecret, {
        algorithms: ['HS256'],
      }) as StaffJwtPayload;
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Session expired or invalid authentication token.');
    }

    const { rows } = await query<ActiveUserRow>(
      `SELECT u.id, u.business_id, u.email, u.full_name, u.role, u.outlet_id,
              o.business_id AS outlet_business_id, u.is_active
       FROM users u
       LEFT JOIN outlets o ON o.id = u.outlet_id
       WHERE u.id = $1`,
      [decoded.userId],
    );

    const userRow = rows[0];
    if (!userRow || !userRow.is_active) {
      throw new AppError(401, 'USER_INACTIVE', 'Account is disabled or no longer active.');
    }

    req.user = {
      userId: userRow.id,
      businessId: userRow.business_id,
      email: userRow.email,
      fullName: userRow.full_name,
      role: userRow.role,
      outletId: userRow.outlet_id,
      outletBusinessId: userRow.outlet_business_id,
    };

    next();
  } catch (err) {
    next(err);
  }
}
