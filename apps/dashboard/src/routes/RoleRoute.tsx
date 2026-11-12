import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { StaffRole } from '@sharon/shared';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';

interface RoleRouteProps {
  allowedRoles: StaffRole[];
  children: ReactNode;
}

export function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const user = useDashboardUiStore((state) => state.user);

  if (!user) {
    return <Navigate to="/401" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
