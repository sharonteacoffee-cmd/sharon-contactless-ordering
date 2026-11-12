import type { NextFunction, Request, Response } from 'express';
import type { StaffRole } from '@sharon/shared';
import type { AuthenticatedStaffUser } from '../types/auth.types';
import { AppError } from '../utils/appError';

export function authorizeRoles(...allowedRoles: StaffRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'UNAUTHORIZED', 'Authentication required.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          403,
          'FORBIDDEN_ROLE',
          'You do not have permission to perform this action.',
        ),
      );
      return;
    }

    next();
  };
}

/**
 * Enforces IDOR/BOLA isolation: MD may access any outlet; OUTLET_STAFF may only access their assigned outlet.
 */
export function assertOutletScope(
  user: AuthenticatedStaffUser,
  targetOutletId: string,
): void {
  if (user.role === 'MD') {
    return;
  }

  if (!user.outletId || user.outletId !== targetOutletId) {
    throw new AppError(
      403,
      'FORBIDDEN_OUTLET_SCOPE',
      'Access denied: you are not authorized to access another outlet.',
    );
  }
}

/**
 * Enforces IDOR/BOLA isolation using outlet business ID (e.g. OUT2611120001).
 */
export function assertOutletBusinessIdScope(
  user: AuthenticatedStaffUser,
  targetOutletBusinessId: string,
): void {
  if (user.role === 'MD') {
    return;
  }

  if (!user.outletBusinessId || user.outletBusinessId !== targetOutletBusinessId) {
    throw new AppError(
      403,
      'FORBIDDEN_OUTLET_SCOPE',
      'Access denied: you are not authorized to access another outlet.',
    );
  }
}
