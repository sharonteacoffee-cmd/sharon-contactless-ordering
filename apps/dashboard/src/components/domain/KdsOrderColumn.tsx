import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Pagination, Popconfirm, Tag } from 'antd';
import {
  CheckCircle2,
  Clock,
  Coffee,
  CreditCard,
  Flame,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  formatElapsedLabel,
  formatISTTime,
  type ContactlessOrder,
  type OrderStatus,
} from '@sharon/shared';
import { EmptyState } from '../common/EmptyState';
import { PaymentStatusBadge } from '../common/StatusBadge';

interface LiveElapsedBadgeProps {
  createdAt: string;
}

function LiveElapsedBadge({ createdAt }: LiveElapsedBadgeProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-cream px-2 py-0.5 text-[11px] font-medium text-brand-chai tabular-nums">
      <Clock className="h-3 w-3" />
      {formatElapsedLabel(createdAt)} • {formatISTTime(createdAt)} IST
    </span>
  );
}

interface KdsOrderColumnProps {
  title: string;
  accentColor: string;
  orders: ContactlessOrder[];
  emptyText: string;
  verifyingOrderId: string | null;
  updatingOrderId: string | null;
  onVerifyAndBrew: (orderBusinessId: string) => void;
  onTransitionStatus: (
    orderBusinessId: string,
    nextStatus: OrderStatus,
  ) => void;
  pageSize?: number;
}

export function KdsOrderColumn({
  title,
  accentColor,
  orders,
  emptyText,
  verifyingOrderId,
  updatingOrderId,
  onVerifyAndBrew,
  onTransitionStatus,
  pageSize = 0,
}: KdsOrderColumnProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const isPaginated = pageSize > 0 && orders.length > pageSize;

  useEffect(() => {
    if (pageSize > 0) {
      const maxPage = Math.max(1, Math.ceil(orders.length / pageSize));
      if (currentPage > maxPage) {
        setCurrentPage(1);
      }
    }
  }, [orders.length, pageSize, currentPage]);

  const displayedOrders = useMemo(() => {
    if (!isPaginated) return orders;
    const start = (currentPage - 1) * pageSize;
    return orders.slice(start, start + pageSize);
  }, [orders, isPaginated, currentPage, pageSize]);

  return (
    <div className="flex h-full min-h-[540px] max-h-[calc(100vh-210px)] flex-col rounded-2xl border border-brand-border bg-white/85 p-3 shadow-soft">
      <div className="mb-3 flex items-center justify-between border-b border-brand-border pb-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <h3 className="m-0 text-sm font-bold tracking-tight text-brand-black">
            {title}
          </h3>
        </div>
        <Badge
          count={orders.length}
          showZero
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {orders.length === 0 ? (
          <EmptyState title={emptyText} />
        ) : (
          displayedOrders.map((order) => {
            const isUpiClaimed = order.paymentStatus === 'UPI_CLAIMED_DEMO';
            const isPending = order.paymentStatus === 'PAYMENT_PENDING';
            const isVerifying = verifyingOrderId === order.orderBusinessId;
            const isUpdating = updatingOrderId === order.orderBusinessId;

            return (
              <Card
                key={order.orderBusinessId}
                size="small"
                className={`rounded-xl border transition-all ${
                  isUpiClaimed
                    ? 'kds-pulse-ring border-brand-amber bg-amber-50/40'
                    : 'border-brand-border bg-white'
                }`}
                styles={{ body: { padding: '12px' } }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base font-bold text-brand-forest tabular-nums">
                        {order.orderNumber}
                      </span>
                      {order.tableOrToken ? (
                        <Tag className="m-0 rounded-full border-brand-border bg-brand-cream text-[11px] font-medium text-brand-black">
                          {order.tableOrToken}
                        </Tag>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-[11px] text-brand-muted">
                      {order.orderBusinessId}
                      {order.outletName ? ` • ${order.outletName}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mb-1 text-base font-bold text-brand-black tabular-nums">
                      ₹{Number(order.totalAmount).toFixed(2)}
                    </div>
                    <PaymentStatusBadge
                      paymentStatus={order.paymentStatus}
                      paymentMethod={order.paymentMethod}
                    />
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-brand-muted">
                  <span className="font-medium text-brand-black">
                    {order.customerName} ({order.customerPhone})
                  </span>
                  <LiveElapsedBadge createdAt={order.createdAt} />
                </div>

                {isUpiClaimed ? (
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-brand-amber/70 bg-[#FEF3C7] px-2.5 py-1.5 text-xs font-semibold text-[#78350F]">
                    <CreditCard className="h-4 w-4 shrink-0" />
                    <span>
                      UPI CLAIMED • Check ₹{Number(order.totalAmount).toFixed(2)}{' '}
                      • Note: {order.orderNumber}
                    </span>
                  </div>
                ) : null}

                <div className="mt-2.5 space-y-1.5 border-t border-dashed border-brand-border pt-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={`${order.orderBusinessId}-${item.menuItemId}-${idx}`}
                      className="text-xs"
                    >
                      <div className="flex justify-between font-semibold text-brand-black">
                        <span>
                          {item.quantity} × {item.name}
                        </span>
                        <span className="tabular-nums">
                          ₹{Number(item.lineTotal).toFixed(2)}
                        </span>
                      </div>
                      {item.selectedModifiers.length > 0 ? (
                        <div className="pl-3 text-[11px] text-brand-muted">
                          {item.selectedModifiers
                            .map((mod) => mod.optionName)
                            .join(', ')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {order.notes ? (
                    <div className="rounded-md bg-brand-cream px-2 py-1 text-[11px] italic text-brand-chai">
                      Note: {order.notes}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {isUpiClaimed ? (
                    <Button
                      type="primary"
                      block
                      size="middle"
                      loading={isVerifying}
                      icon={<ShieldCheck className="h-4 w-4" />}
                      onClick={() => onVerifyAndBrew(order.orderBusinessId)}
                      className="font-semibold"
                    >
                      Verify Payment &amp; Brew
                    </Button>
                  ) : null}

                  {order.orderStatus === 'RECEIVED' && !isUpiClaimed ? (
                    <Button
                      type={isPending ? 'default' : 'primary'}
                      size="small"
                      className="flex-1"
                      loading={isUpdating}
                      icon={<Flame className="h-3.5 w-3.5" />}
                      onClick={() =>
                        onTransitionStatus(order.orderBusinessId, 'PREPARING')
                      }
                    >
                      Start Preparing
                    </Button>
                  ) : null}

                  {order.orderStatus === 'PREPARING' ? (
                    <Button
                      type="primary"
                      size="small"
                      className="flex-1"
                      style={{ backgroundColor: '#1C4C34' }}
                      loading={isUpdating}
                      icon={<Coffee className="h-3.5 w-3.5" />}
                      onClick={() =>
                        onTransitionStatus(order.orderBusinessId, 'READY')
                      }
                    >
                      Mark Ready
                    </Button>
                  ) : null}

                  {order.orderStatus === 'READY' ? (
                    <Button
                      type="primary"
                      size="small"
                      className="flex-1"
                      style={{ backgroundColor: '#34A43C' }}
                      loading={isUpdating}
                      icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                      onClick={() =>
                        onTransitionStatus(order.orderBusinessId, 'COMPLETED')
                      }
                    >
                      Complete Pickup
                    </Button>
                  ) : null}

                  {(order.orderStatus === 'RECEIVED' ||
                    order.orderStatus === 'PREPARING') && (
                    <Popconfirm
                      title="Cancel this order?"
                      description="This will notify the customer immediately."
                      okText="Cancel Order"
                      okButtonProps={{ danger: true }}
                      onConfirm={() =>
                        onTransitionStatus(order.orderBusinessId, 'CANCELLED')
                      }
                    >
                      <Button
                        danger
                        size="small"
                        loading={isUpdating}
                        icon={<XCircle className="h-3.5 w-3.5" />}
                      >
                        Cancel
                      </Button>
                    </Popconfirm>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {isPaginated ? (
        <div className="mt-2.5 pt-2 border-t border-brand-border flex items-center justify-between gap-1 px-1 shrink-0 bg-white/50 rounded-lg">
          <span className="text-[11px] font-semibold text-brand-muted">
            {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, orders.length)} of {orders.length}
          </span>
          <Pagination
            size="small"
            simple
            current={currentPage}
            pageSize={pageSize}
            total={orders.length}
            onChange={(p) => setCurrentPage(p)}
          />
        </div>
      ) : null}
    </div>
  );
}
