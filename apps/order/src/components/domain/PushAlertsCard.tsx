import { Bell, BellOff, BellRing, CheckCircle2, Loader2, ShieldAlert, X } from 'lucide-react';
import { useCustomerPushNotifications } from '@/hooks/useCustomerPushNotifications';

interface PushAlertsCardProps {
  orderBusinessId?: string;
  outletSlug?: string;
  description?: string;
}

export function PushAlertsCard({
  orderBusinessId,
  outletSlug,
  description = 'Get instant push alerts when your order is Ready',
}: PushAlertsCardProps) {
  const {
    isSupported,
    isConfigured,
    permission,
    isActive,
    isRegistering,
    error,
    foregroundToast,
    dismissForegroundToast,
    enablePushAlerts,
    disablePushAlerts,
  } = useCustomerPushNotifications({
    orderBusinessId,
    outletSlug,
  });

  const renderActionControl = () => {
    if (!isSupported) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F4] border border-[#D6D3D1] text-[#44403C] text-[11px] font-semibold shrink-0">
          <BellOff className="w-3.5 h-3.5" />
          Browser Unsupported
        </span>
      );
    }

    if (!isConfigured) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[11px] font-semibold shrink-0">
          <Bell className="w-3.5 h-3.5" />
          Push setup pending Firebase keys
        </span>
      );
    }

    if (permission === 'denied') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-rust/10 border border-brand-rust/30 text-brand-rust text-[11px] font-semibold shrink-0">
          <ShieldAlert className="w-3.5 h-3.5" />
          Notifications Blocked
        </span>
      );
    }

    if (isActive) {
      return (
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DCFCE7] border border-[#86EFAC] text-[#14532D] text-[11px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-leaf" />
            Push Alerts Active
          </span>
          <button
            type="button"
            disabled={isRegistering}
            onClick={() => void disablePushAlerts()}
            className="btn-cream-secondary px-3 py-1.5 rounded-full text-[11px] font-semibold disabled:opacity-60"
          >
            {isRegistering ? 'Updating...' : 'Disable'}
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={isRegistering}
        onClick={() => void enablePushAlerts()}
        className="btn-forest-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold shrink-0 disabled:opacity-60"
      >
        {isRegistering ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <BellRing className="w-3.5 h-3.5" />
        )}
        <span>{isRegistering ? 'Enabling...' : 'Enable Push Alerts'}</span>
      </button>
    );
  };

  return (
    <div className="space-y-3">
      {foregroundToast ? (
        <div
          role="status"
          className="glass-light rounded-2xl border border-[#86EFAC] bg-[#DCFCE7]/90 px-4 py-3 flex items-start justify-between gap-3 shadow-sm"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-brand-forest text-white flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#14532D] truncate">{foregroundToast.title}</p>
              <p className="text-xs text-[#14532D]/90 mt-0.5 leading-snug">
                {foregroundToast.body}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={dismissForegroundToast}
            className="text-[#14532D]/70 hover:text-[#14532D] p-1 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : null}

      <section className="glass-light rounded-3xl p-4 sm:p-5 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-brand-forest/10 text-brand-forest flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-brand-black">
                Live Push Alerts
              </h2>
              <p className="text-xs text-brand-muted leading-relaxed">{description}</p>
            </div>
          </div>

          {renderActionControl()}
        </div>

        {permission === 'denied' && isSupported && isConfigured ? (
          <p className="text-[11px] text-brand-rust leading-relaxed">
            Notifications are currently blocked in your browser. Click the site settings icon in
            your browser&apos;s address bar, allow Notifications, and reload to activate push alerts.
          </p>
        ) : error && isConfigured && isSupported ? (
          <p className="text-[11px] text-brand-rust leading-relaxed">{error}</p>
        ) : null}
      </section>
    </div>
  );
}
