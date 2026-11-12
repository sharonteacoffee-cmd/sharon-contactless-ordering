import { Route, Routes } from 'react-router-dom';
import { CheckoutAndPayPage } from '@/pages/CheckoutAndPayPage';
import { CustomerProfilePage } from '@/pages/CustomerProfilePage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { OrderLiveStatusPage } from '@/pages/OrderLiveStatusPage';
import { OutletMenuPage } from '@/pages/OutletMenuPage';
import { OutletOrderingPausedPage } from '@/pages/OutletOrderingPausedPage';
import { OutletSelectorLandingPage } from '@/pages/OutletSelectorLandingPage';
import { ServerErrorPage } from '@/pages/ServerErrorPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<OutletSelectorLandingPage />} />
      <Route path="/profile" element={<CustomerProfilePage />} />
      <Route path="/order/:outletSlug" element={<OutletMenuPage />} />
      <Route path="/order/:outletSlug/checkout" element={<CheckoutAndPayPage />} />
      <Route path="/order/status/:orderBusinessId" element={<OrderLiveStatusPage />} />
      <Route path="/track/:orderBusinessId" element={<OrderLiveStatusPage />} />
      <Route path="/outlet-paused" element={<OutletOrderingPausedPage />} />
      <Route path="/maintenance" element={<MaintenancePage />} />
      <Route path="/500" element={<ServerErrorPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
