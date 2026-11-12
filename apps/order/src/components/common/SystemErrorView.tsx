import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, RefreshCw } from 'lucide-react';

interface SystemErrorViewProps {
  code: string;
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export function SystemErrorView({
  code,
  title,
  description,
  icon,
  actionLabel = 'Browse Outlets',
  actionTo = '/',
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: SystemErrorViewProps) {
  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4 relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-brand-forest/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-brand-amber/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md glass-light rounded-3xl p-8 text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-brand-forest text-white flex items-center justify-center shadow-primaryBtn">
          {icon ?? <Coffee className="w-8 h-8" />}
        </div>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-brand-burgundy/10 text-brand-burgundy mb-3">
          Sharon Tea &amp; Coffee • {code}
        </span>

        <h1 className="font-display text-2xl font-bold text-brand-black mb-2">{title}</h1>
        <p className="text-sm text-brand-muted leading-relaxed mb-6">{description}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="btn-forest-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              {actionLabel}
            </button>
          ) : (
            <Link
              to={actionTo}
              className="btn-forest-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold"
            >
              {actionLabel}
            </Link>
          )}

          {secondaryLabel && onSecondaryAction ? (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="btn-cream-secondary inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-medium"
            >
              {secondaryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
