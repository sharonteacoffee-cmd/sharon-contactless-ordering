import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Coffee,
  QrCode,
  Radio,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatElapsedLabel } from '@sharon/shared';
import { ApiClientError } from '@/api/axiosClient';
import { EmptyState } from '@/components/common/EmptyState';
import { IstClockBadge } from '@/components/common/IstClockBadge';
import { LiveStatusStepper } from '@/components/domain/LiveStatusStepper';
import { PushAlertsCard } from '@/components/domain/PushAlertsCard';
import { UpiIntentPaySheet } from '@/components/domain/UpiIntentPaySheet';
import { useOrderTrackingSocket } from '@/hooks/useOrderTrackingSocket';
import { usePublicOrderQuery } from '@/hooks/usePublicOrderQuery';
import { CustomerLayout } from '@/layouts/CustomerLayout';
import type { CreatePublicOrderResponse } from '@/types/order';
import { formatINR } from '@/utils/currency';

export function OrderLiveStatusPage() {
  const { orderBusinessId } = useParams<{ orderBusinessId: string }>();
  const { data: order, isLoading, error, refetch } = usePublicOrderQuery(orderBusinessId);
  const { isConnected } = useOrderTrackingSocket(orderBusinessId);
  const [elapsedLabel, setElapsedLabel] = useState<string>('');
  const [showPendingPaySheet, setShowPendingPaySheet] = useState<boolean>(false);

  // Live local UI clock tick for elapsed seconds counter (no API polling)
  useEffect(() => {
    if (!order?.createdAt) {
      return undefined;
    }

    const updateElapsed = () => {
      try {
        setElapsedLabel(formatElapsedLabel(order.createdAt));
      } catch {
        setElapsedLabel('');
      }
    };

    updateElapsed();
    const intervalId = window.setInterval(updateElapsed, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [order?.createdAt]);

  if (error instanceof ApiClientError) {
    if (error.statusCode === 404) {
      return <Navigate to="/404" replace />;
    }
    if (error.statusCode === 503 || error.statusCode === 0) {
      return <Navigate to="/maintenance" replace />;
    }
  }

  const pendingPaySheetOrder: CreatePublicOrderResponse | null =
    showPendingPaySheet && order?.upiPayload
      ? {
          orderBusinessId: order.orderBusinessId,
          orderNumber: order.orderNumber,
          paymentTransactionId: null,
          outletName: order.outletName,
          totalAmount: order.totalAmount,
          paymentProvider: order.paymentProvider,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          upiPayload: order.upiPayload,
          createdAt: order.createdAt,
        }
      : null;

  const renderPaymentBadge = () => {
    if (!order) {
      return null;
    }

    if (order.paymentStatus === 'PAID_VERIFIED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5 text-brand-leaf" />
          UPI Paid • Show at Counter
        </span>
      );
    }

    if (order.paymentStatus === 'UPI_CLAIMED_DEMO') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          Show at Counter • Verifying UPI
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#FCD34D] text-[#78350F] text-xs font-bold">
        <Clock className="w-3.5 h-3.5" />
        Payment Pending
      </span>
    );
  };

  return (
    <CustomerLayout maxWidthClass="max-w-xl">
      <div className="px-3 sm:px-4 py-5 space-y-4 flex-1">
        {/* Top Connection Status Bar */}
        <div className="flex items-center justify-between gap-2 px-1">
          <Link
            to={order ? `/order/${order.outletSlug}` : '/'}
            className="inline-flex items-center gap-2 text-xs font-semibold text-brand-forest hover:underline"
          >
            <Coffee className="w-4 h-4" />
            <span>{order ? `Back to ${order.outletName}` : 'All Outlets'}</span>
          </Link>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/80 border border-brand-border text-[11px] font-semibold text-brand-muted">
            <Radio
              className={`w-3 h-3 ${isConnected ? 'text-brand-leaf animate-pulse' : 'text-brand-amber'}`}
            />
            <span>{isConnected ? 'Live Updates On' : 'Reconnecting...'}</span>
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="glass-light rounded-3xl p-6 h-56 animate-pulse bg-white/60" />
            <div className="glass-light rounded-3xl p-6 h-64 animate-pulse bg-white/60" />
          </div>
        ) : error || !order ? (
          <EmptyState
            title="Could not load order status"
            description={
              error instanceof Error
                ? error.message
                : 'We could not find this order token. Please check the link or ask at the counter.'
            }
            action={
              <button
                type="button"
                onClick={() => void refetch()}
                className="btn-forest-primary px-5 py-2.5 rounded-full text-xs font-semibold"
              >
                Refresh Status
              </button>
            }
          />
        ) : (
          <>
            {/* Hero Frosted Token Pass Card */}
            <section className="glass-light rounded-3xl p-6 text-center space-y-4 relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-burgundy/10 text-brand-burgundy text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                Counter Pickup Pass
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-muted">
                  Token Number
                </p>
                <h1 className="font-display text-4xl sm:text-5xl font-bold text-brand-burgundy tracking-tight mt-1 tabular-price">
                  {order.orderNumber}
                </h1>
              </div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                {renderPaymentBadge()}
              </div>

              <div className="rounded-2xl bg-brand-cream/95 border border-brand-border p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <div className="text-left">
                  <p className="text-brand-muted">Total Paid / Payable</p>
                  <p className="text-base font-bold text-brand-black tabular-price">
                    {formatINR(order.totalAmount, true)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-brand-muted">UPI Reference Note</p>
                  <p className="font-bold text-brand-black">
                    Order {order.orderNumber.replace(/^#/, '')}
                  </p>
                </div>
              </div>

              {order.paymentStatus === 'PAYMENT_PENDING' && order.upiPayload ? (
                <button
                  type="button"
                  onClick={() => setShowPendingPaySheet(true)}
                  className="btn-amber-cta w-full py-3 px-5 rounded-full text-xs inline-flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Complete UPI Payment Now</span>
                </button>
              ) : null}

              {/* Canonical IST Timestamp + Live Ticking Elapsed Seconds */}
              <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
                <IstClockBadge utcTimestamp={order.createdAt} showDate />
                {elapsedLabel ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-black text-white text-xs font-semibold tabular-price">
                    Ordered {elapsedLabel}
                  </span>
                ) : null}
              </div>
            </section>

            {/* Real-Time Vertical Progress Stepper */}
            <LiveStatusStepper
              orderStatus={order.orderStatus}
              estimatedPrepTimeMinutes={order.estimatedPrepTimeMinutes}
            />

            {/* Firebase Web Push Alerts Banner */}
            <PushAlertsCard
              orderBusinessId={order.orderBusinessId}
              outletSlug={order.outletSlug}
              description="Get instant push alerts when your order is Ready"
            />

            {/* Sanitized Order Receipt Summary */}
            <section className="glass-light rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-brand-black">Order Summary</h2>
                <span className="text-xs font-medium text-brand-muted">
                  {order.orderBusinessId}
                </span>
              </div>

              <div className="text-xs text-brand-muted flex flex-wrap gap-x-4 gap-y-1">
                <span>
                  Guest: <strong className="text-brand-black">{order.customerName}</strong>
                </span>
                <span>
                  Mobile:{' '}
                  <strong className="text-brand-black tabular-price">
                    {order.maskedCustomerPhone}
                  </strong>
                </span>
                {order.tableOrToken ? (
                  <span>
                    Pickup: <strong className="text-brand-black">{order.tableOrToken}</strong>
                  </span>
                ) : null}
              </div>

              <ul className="divide-y divide-brand-border pt-1">
                {order.items.map((item, idx) => (
                  <li
                    key={`${item.menuItemId}-${idx}`}
                    className="py-2.5 flex items-start justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div>
                      <p className="font-semibold text-brand-black">
                        {item.quantity} × {item.name}
                      </p>
                      {item.selectedModifiers.length > 0 ? (
                        <p className="text-xs text-brand-muted mt-0.5">
                          {item.selectedModifiers.map((m) => m.optionName).join(' • ')}
                        </p>
                      ) : null}
                    </div>
                    <span className="font-bold text-brand-black tabular-price shrink-0">
                      {formatINR(item.lineTotal, true)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-2 border-t border-brand-border flex items-center justify-between text-sm font-bold text-brand-black">
                <span>Total</span>
                <span className="tabular-price">{formatINR(order.totalAmount, true)}</span>
              </div>
            </section>
          </>
        )}
      </div>

      <UpiIntentPaySheet
        order={pendingPaySheetOrder}
        onClose={() => setShowPendingPaySheet(false)}
        onPaymentSubmitted={() => {
          setShowPendingPaySheet(false);
          void refetch();
        }}
      />
    </CustomerLayout>
  );
}
