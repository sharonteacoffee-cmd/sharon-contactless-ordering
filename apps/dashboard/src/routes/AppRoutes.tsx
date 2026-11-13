import { useEffect } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { registerNavigationHandler } from '../api/axiosClient';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DashboardErrorPage } from '../pages/DashboardErrorPage';
import { DashboardNotFoundPage } from '../pages/DashboardNotFoundPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { LiveOrdersKdsPage } from '../pages/LiveOrdersKdsPage';
import { MdAnalyticsOverviewPage } from '../pages/MdAnalyticsOverviewPage';
import { MenuSyncPage } from '../pages/MenuSyncPage';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { OutletConfigPage } from '../pages/OutletConfigPage';
import { ProductsPage } from '../pages/ProductsPage';
import { QrMasterPage } from '../pages/QrMasterPage';
import { ServiceUnavailablePage } from '../pages/ServiceUnavailablePage';
import { StaffLoginPage } from '../pages/StaffLoginPage';
import { StockControlPage } from '../pages/StockControlPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { UserManagementPage } from '../pages/UserManagementPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

export function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    return registerNavigationHandler((path) => {
      navigate(path, { replace: true });
    });
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<StaffLoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/kds" replace />} />
        <Route path="/kds" element={<LiveOrdersKdsPage />} />
        <Route path="/stock" element={<StockControlPage />} />
        <Route path="/orders/history" element={<OrderHistoryPage />} />

        <Route
          path="/md/overview"
          element={
            <RoleRoute allowedRoles={['MD']}>
              <MdAnalyticsOverviewPage />
            </RoleRoute>
          }
        />
        <Route
          path="/md/menu-sync"
          element={
            <RoleRoute allowedRoles={['MD']}>
              <MenuSyncPage />
            </RoleRoute>
          }
        />
        <Route
          path="/md/qr-master"
          element={
            <RoleRoute allowedRoles={['MD']}>
              <QrMasterPage />
            </RoleRoute>
          }
        />
        <Route
          path="/md/products"
          element={
            <RoleRoute allowedRoles={['MD']}>
              <ProductsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/md/outlets"
          element={
            <RoleRoute allowedRoles={['MD']}>
              <OutletConfigPage />
            </RoleRoute>
          }
        />
        <Route
          path="/md/users"
          element={
            <RoleRoute allowedRoles={['MD']}>
              <UserManagementPage />
            </RoleRoute>
          }
        />
      </Route>

      <Route path="/401" element={<UnauthorizedPage />} />
      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/404" element={<DashboardNotFoundPage />} />
      <Route path="/500" element={<DashboardErrorPage />} />
      <Route path="/503" element={<ServiceUnavailablePage />} />
      <Route path="*" element={<DashboardNotFoundPage />} />
    </Routes>
  );
}
