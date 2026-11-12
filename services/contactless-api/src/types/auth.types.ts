import type { StaffRole } from '@sharon/shared';

export interface AuthenticatedStaffUser {
  userId: string;
  businessId: string;
  email: string;
  fullName: string;
  role: StaffRole;
  outletId: string | null;
  outletBusinessId: string | null;
}

export interface AuthenticatedCustomerSession {
  customerId: string;
  customerBusinessId: string;
  phone: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedStaffUser;
      customer?: AuthenticatedCustomerSession;
      rawBody?: Buffer;
    }
  }
}
