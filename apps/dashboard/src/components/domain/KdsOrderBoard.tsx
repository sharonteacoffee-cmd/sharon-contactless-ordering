import { useMemo } from 'react';
import type { ContactlessOrder, OrderStatus } from '@sharon/shared';
import { KdsOrderColumn } from './KdsOrderColumn';

interface KdsOrderBoardProps {
  orders: ContactlessOrder[];
  verifyingOrderId: string | null;
  updatingOrderId: string | null;
  onVerifyAndBrew: (orderBusinessId: string) => void;
  onTransitionStatus: (
    orderBusinessId: string,
    nextStatus: OrderStatus,
  ) => void;
}

export function KdsOrderBoard({
  orders,
  verifyingOrderId,
  updatingOrderId,
  onVerifyAndBrew,
  onTransitionStatus,
}: KdsOrderBoardProps) {
  const receivedOrders = orders.filter((o) => o.orderStatus === 'RECEIVED');
  const preparingOrders = orders.filter((o) => o.orderStatus === 'PREPARING');
  const readyOrders = orders.filter((o) => o.orderStatus === 'READY');
  const completedOrders = useMemo(
    () =>
      orders
        .filter((o) => o.orderStatus === 'COMPLETED')
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime(),
        ),
    [orders],
  );

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 items-start">
      <KdsOrderColumn
        title="New 🔔"
        accentColor="#FC9C34"
        orders={receivedOrders}
        emptyText="No new incoming orders"
        verifyingOrderId={verifyingOrderId}
        updatingOrderId={updatingOrderId}
        onVerifyAndBrew={onVerifyAndBrew}
        onTransitionStatus={onTransitionStatus}
      />
      <KdsOrderColumn
        title="Preparing"
        accentColor="#A44C14"
        orders={preparingOrders}
        emptyText="Nothing currently brewing"
        verifyingOrderId={verifyingOrderId}
        updatingOrderId={updatingOrderId}
        onVerifyAndBrew={onVerifyAndBrew}
        onTransitionStatus={onTransitionStatus}
      />
      <KdsOrderColumn
        title="Ready for Pickup"
        accentColor="#1C4C34"
        orders={readyOrders}
        emptyText="No orders waiting at counter"
        verifyingOrderId={verifyingOrderId}
        updatingOrderId={updatingOrderId}
        onVerifyAndBrew={onVerifyAndBrew}
        onTransitionStatus={onTransitionStatus}
      />
      <KdsOrderColumn
        title="Completed"
        accentColor="#34A43C"
        orders={completedOrders}
        emptyText="No recently completed orders"
        verifyingOrderId={verifyingOrderId}
        updatingOrderId={updatingOrderId}
        onVerifyAndBrew={onVerifyAndBrew}
        onTransitionStatus={onTransitionStatus}
        pageSize={4}
      />
    </div>
  );
}
