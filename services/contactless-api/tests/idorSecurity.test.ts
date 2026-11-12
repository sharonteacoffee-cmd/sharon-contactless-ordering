import { describe, expect, it, vi } from 'vitest';
import {
  assertOutletBusinessIdScope,
  assertOutletScope,
  authorizeRoles,
} from '../src/middleware/authorize.middleware';
import * as outletStockRepo from '../src/modules/outletStock/outletStock.repository';
import { getOutletStock } from '../src/modules/outletStock/outletStock.service';
import type { AuthenticatedStaffUser } from '../src/types/auth.types';
import { AppError } from '../src/utils/appError';

describe('RBAC & IDOR Outlet Isolation', () => {
  const outletAStaff: AuthenticatedStaffUser = {
    userId: 'usr-a',
    businessId: 'USR2611120002',
    email: 'staff.a@sharonteastall.local',
    fullName: 'Staff A',
    role: 'OUTLET_STAFF',
    outletId: 'outlet-a-uuid',
    outletBusinessId: 'OUT2611120001',
  };

  const mdUser: AuthenticatedStaffUser = {
    userId: 'usr-md',
    businessId: 'USR2611120001',
    email: 'md@sharonteastall.com',
    fullName: 'Managing Director',
    role: 'MD',
    outletId: null,
    outletBusinessId: null,
  };

  it('blocks OUTLET_STAFF from accessing another outlet UUID or businessId with 403', () => {
    expect(() => assertOutletScope(outletAStaff, 'outlet-a-uuid')).not.toThrow();
    expect(() => assertOutletScope(outletAStaff, 'outlet-b-uuid')).toThrowError(AppError);

    try {
      assertOutletBusinessIdScope(outletAStaff, 'OUT2611120002');
    } catch (err) {
      expect((err as AppError).statusCode).toBe(403);
      expect((err as AppError).code).toBe('FORBIDDEN_OUTLET_SCOPE');
    }
  });

  it('allows MD cross-outlet access and rejects OUTLET_STAFF on MD-only middleware', () => {
    expect(() => assertOutletScope(mdUser, 'outlet-b-uuid')).not.toThrow();

    const mdOnlyMiddleware = authorizeRoles('MD');
    const next = vi.fn();
    mdOnlyMiddleware({ user: outletAStaff } as never, {} as never, next);

    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN_ROLE');
  });

  it('blocks OUTLET_STAFF from reading Outlet B stock via getOutletStock', async () => {
    vi.spyOn(outletStockRepo, 'findOutletByBusinessId').mockResolvedValueOnce({
      id: 'outlet-b-uuid',
      business_id: 'OUT2611120002',
      slug: 'new-thippasandra',
      name: 'Sharon New Thippasandra',
    });

    await expect(getOutletStock(outletAStaff, 'OUT2611120002')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN_OUTLET_SCOPE',
    });
  });
});
