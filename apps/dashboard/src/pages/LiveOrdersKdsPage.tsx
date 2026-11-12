import { useMemo, useState } from 'react';
import { Alert, Button, Card, Skeleton, Tag, message } from 'antd';
import { BellRing, RefreshCw, ShieldAlert } from 'lucide-react';
import type { OrderStatus } from '@sharon/shared';
import { KdsOrderBoard } from '../components/domain/KdsOrderBoard';
import {
  useLiveOrdersQuery,
  useUpdateOrderStatusMutation,
  useVerifyPaymentMutation,
} from '../hooks/useOrderHooks';
import { useDashboardUiStore } from '../stores/useDashboardUiStore';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { playOrderBellChime, unlockAudioChime } from '../utils/soundChime';

export function LiveOrdersKdsPage() {
  const user = useDashboardUiStore((state) => state.user);
  const selectedOutletBusinessId = useDashboardUiStore(
    (state) => state.selectedOutletBusinessId,
  );
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const effectiveOutletBusinessId =
    user?.role === 'OUTLET_STAFF'
      ? user.outletBusinessId
      : selectedOutletBusinessId;

  const liveOrdersQuery = useLiveOrdersQuery(effectiveOutletBusinessId);
  const verifyPaymentMutation = useVerifyPaymentMutation();
  const updateStatusMutation = useUpdateOrderStatusMutation();

  const orders = liveOrdersQuery.data ?? [];

  const summary = useMemo(() => {
    let awaitingVerify = 0;
    let received = 0;
    let preparing = 0;
    let ready = 0;
    for (const order of orders) {
      if (order.paymentStatus === 'UPI_CLAIMED_DEMO') awaitingVerify += 1;
      if (order.orderStatus === 'RECEIVED') received += 1;
      if (order.orderStatus === 'PREPARING') preparing += 1;
      if (order.orderStatus === 'READY') ready += 1;
    }
    return { awaitingVerify, received, preparing, ready };
  }, [orders]);

  const handleVerifyAndBrew = async (orderBusinessId: string) => {
    try {
      setVerifyingOrderId(orderBusinessId);
      await verifyPaymentMutation.mutateAsync({
        orderBusinessId,
        payload: { startPreparingImmediately: true },
      });
      message.success(`Payment verified & brewing started for ${orderBusinessId}`);
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to verify payment.'),
      );
    } finally {
      setVerifyingOrderId(null);
    }
  };

  const handleTransitionStatus = async (
    orderBusinessId: string,
    nextStatus: OrderStatus,
  ) => {
    try {
      setUpdatingOrderId(orderBusinessId);
      await updateStatusMutation.mutateAsync({
        orderBusinessId,
        payload: { orderStatus: nextStatus },
      });
      message.success(`Order ${orderBusinessId} moved to ${nextStatus}`);
    } catch (error) {
      message.error(
        extractApiErrorMessage(error, 'Failed to update order status.'),
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleTestChime = async () => {
    await unlockAudioChime();
    await playOrderBellChime(false);
    message.info('Counter bell chime tested');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-bold text-brand-black">
            Live Kitchen Display (KDS)
          </h1>
          <p className="m-0 text-xs text-brand-muted">
            Real-time Socket.io push updates • Zero polling • Timestamps in IST
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {summary.awaitingVerify > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#78350F]">
              <ShieldAlert className="h-3.5 w-3.5" />
              {summary.awaitingVerify} UPI Verify Pending
            </span>
          ) : null}
          <Tag className="m-0 rounded-full border-[#FCD34D] bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#78350F]">
            New: {summary.received}
          </Tag>
          <Tag className="m-0 rounded-full border-[#FDBA74] bg-[#FFEDD5] px-3 py-1 text-xs font-semibold text-[#7C2D12]">
            Preparing: {summary.preparing}
          </Tag>
          <Tag className="m-0 rounded-full border-[#86EFAC] bg-[#DCFCE7] px-3 py-1 text-xs font-semibold text-[#14532D]">
            Ready: {summary.ready}
          </Tag>
          <Button
            icon={<BellRing className="h-4 w-4" />}
            onClick={handleTestChime}
          >
            Test Chime
          </Button>
          <Button
            icon={<RefreshCw className="h-4 w-4" />}
            loading={liveOrdersQuery.isFetching}
            onClick={() => void liveOrdersQuery.refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {liveOrdersQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message="Unable to load live orders"
          description={extractApiErrorMessage(liveOrdersQuery.error)}
        />
      ) : null}

      {liveOrdersQuery.isLoading ? (
        <Card className="rounded-2xl">
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      ) : (
        <KdsOrderBoard
          orders={orders}
          verifyingOrderId={verifyingOrderId}
          updatingOrderId={updatingOrderId}
          onVerifyAndBrew={handleVerifyAndBrew}
          onTransitionStatus={handleTransitionStatus}
        />
      )}
    </div>
  );
}
