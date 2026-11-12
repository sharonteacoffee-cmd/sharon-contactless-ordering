import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const token = useDashboardUiStore((state) => state.token);
  const user = useDashboardUiStore((state) => state.user);

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
