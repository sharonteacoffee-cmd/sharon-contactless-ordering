import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { toApiClientError } from '@/api/axiosClient';
import { useSubmitDemoPaymentMutation } from '@/hooks/useSubmitDemoPaymentMutation';
import type { CreatePublicOrderResponse } from '@/types/order';
import { formatINR } from '@/utils/currency';

interface UpiIntentPaySheetProps {
  order: CreatePublicOrderResponse | null;
  onClose: () => void;
  onPaymentSubmitted: (orderBusinessId: string) => void;
}

const CONFIRMATION_DELAY_MS = 3000;

export function UpiIntentPaySheet({
  order,
  onClose,
  onPaymentSubmitted,
}: UpiIntentPaySheetProps) {
  const { mutateAsync: submitDemoPayment } = useSubmitDemoPaymentMutation();
  const [hasLaunchedUpiApp, setHasLaunchedUpiApp] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentSubmittedToast, setPaymentSubmittedToast] = useState(false);
  const [copiedNote, setCopiedNote] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submissionLockRef = useRef(false);

  const referenceNote = order ? `Order ${order.orderNumber.replace(/^#/, '')}` : '';

  const runConfirmationSequence = useCallback(async () => {
    if (!order || submissionLockRef.current) {
      return;
    }

    submissionLockRef.current = true;
    setIsConfirming(true);
    setSubmitError(null);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, CONFIRMATION_DELAY_MS));
      await submitDemoPayment({
        orderBusinessId: order.orderBusinessId,
        payload: {
          upiReturnDelayMs: CONFIRMATION_DELAY_MS,
          customerConfirmedPaid: true,
        },
      });
      setPaymentSubmittedToast(true);
      window.setTimeout(() => {
        onPaymentSubmitted(order.orderBusinessId);
      }, 650);
    } catch (err) {
      submissionLockRef.current = false;
      setIsConfirming(false);
      setSubmitError(toApiClientError(err).message);
    }
  }, [order, onPaymentSubmitted, submitDemoPayment]);

  useEffect(() => {
    if (!order || !hasLaunchedUpiApp) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !submissionLockRef.current) {
        void runConfirmationSequence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [order, hasLaunchedUpiApp, runConfirmationSequence]);

  if (!order || !order.upiPayload) {
    return null;
  }

  const { upiUri, payeeName, amountFormatted } = order.upiPayload;

  const handleCopyReference = async () => {
    try {
      await navigator.clipboard.writeText(referenceNote);
      setCopiedNote(true);
      window.setTimeout(() => setCopiedNote(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted webviews
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-black/65 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upi-pay-sheet-title"
    >
      <div className="relative w-full sm:max-w-md glass-sheet sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
        {/* 3-Second Glassmorphic Confirmation Overlay */}
        {isConfirming ? (
          <div className="absolute inset-0 z-20 rounded-t-[32px] sm:rounded-3xl bg-brand-black/90 backdrop-blur-2xl text-white flex flex-col items-center justify-center p-6 text-center gap-4">
            {paymentSubmittedToast ? (
              <>
                <div className="w-16 h-16 rounded-full bg-brand-leaf/20 border border-brand-leaf flex items-center justify-center shadow-leaf-glow">
                  <CheckCircle2 className="w-9 h-9 text-brand-leaf" />
                </div>
                <h3 className="font-display text-2xl font-bold">Payment Submitted!</h3>
                <p className="text-sm text-white/80">
                  Counter staff received token <span className="font-bold">{order.orderNumber}</span>.
                  Opening live tracker...
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-brand-amber/20 border border-brand-amber/60 flex items-center justify-center shadow-amber-glow">
                  <Loader2 className="w-8 h-8 text-brand-amber animate-spin" />
                </div>
                <h3 className="font-display text-2xl font-bold">Confirming Payment...</h3>
                <p className="text-sm text-white/75 max-w-xs leading-relaxed">
                  Sending <span className="font-semibold text-white">{order.orderNumber}</span> to{' '}
                  {order.outletName} counter KDS. Please hold on for 3 seconds.
                </p>
              </>
            )}
          </div>
        ) : null}

        {/* Drag handle */}
        <div className="pb-2 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-brand-grey" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-burgundy/10 text-brand-burgundy text-[11px] font-bold uppercase tracking-wide">
              <Smartphone className="w-3.5 h-3.5" />
              UPI Payment • {order.orderNumber}
            </span>
            <h2
              id="upi-pay-sheet-title"
              className="font-display text-2xl font-bold text-brand-black mt-1.5 tabular-price"
            >
              Pay {formatINR(order.totalAmount, true)}
            </h2>
            <p className="text-xs text-brand-muted">
              Payee: <span className="font-semibold text-brand-black">{payeeName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment sheet"
            className="w-9 h-9 rounded-full bg-white/85 border border-brand-border flex items-center justify-center text-brand-black hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Mobile UPI Intent CTA */}
        <a
          href={upiUri}
          onClick={() => setHasLaunchedUpiApp(true)}
          className="btn-amber-cta w-full py-3.5 px-5 rounded-full text-sm flex items-center justify-center gap-2 shadow-soft mb-4"
        >
          <span>Open UPI App (₹{amountFormatted})</span>
          <ExternalLink className="w-4 h-4" />
        </a>

        {/* Dynamic Scannable QR Card */}
        <div className="glass-light rounded-3xl p-4 flex flex-col items-center text-center gap-3 mb-4">
          <p className="text-xs font-semibold text-brand-muted">
            Or scan Dynamic QR with GPay, PhonePe, or Paytm
          </p>
          <div className="p-3 rounded-2xl bg-white border border-brand-border shadow-sm">
            <QRCodeSVG value={upiUri} size={180} level="M" includeMargin={false} />
          </div>

          {/* Reference Note Pill */}
          <div className="w-full rounded-2xl bg-brand-cream border border-brand-border px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="text-left min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-muted">
                UPI Reference Note (tn)
              </p>
              <p className="text-xs font-bold text-brand-black truncate">{referenceNote}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyReference}
              className="btn-cream-secondary inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedNote ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {submitError ? (
          <div className="mb-3 rounded-2xl bg-brand-rust/10 border border-brand-rust/30 px-3.5 py-2.5 text-xs font-medium text-brand-rust">
            {submitError}
          </div>
        ) : null}

        {/* Explicit Completion Trigger */}
        <button
          type="button"
          onClick={() => void runConfirmationSequence()}
          className="btn-forest-primary w-full py-3.5 px-5 rounded-full font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99]"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>I Have Completed Payment</span>
        </button>

        <p className="mt-2.5 text-[11px] text-center text-brand-muted leading-relaxed">
          Returning from your UPI app automatically triggers counter confirmation. Counter staff
          verifies your payment note <span className="font-semibold text-brand-black">{referenceNote}</span>.
        </p>
      </div>
    </div>
  );
}
