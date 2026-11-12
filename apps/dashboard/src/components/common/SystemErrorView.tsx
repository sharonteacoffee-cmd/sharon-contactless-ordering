import { Button, Card } from 'antd';
import { Coffee } from 'lucide-react';

interface SystemErrorViewProps {
  code: '401' | '403' | '404' | '500' | '503';
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export function SystemErrorView({
  code,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: SystemErrorViewProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-12">
      <Card
        className="w-full max-w-lg rounded-3xl border border-brand-border shadow-soft"
        styles={{ body: { padding: '36px 32px' } }}
      >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-forest text-white">
            <Coffee className="h-7 w-7" />
          </div>
          <span className="mb-2 inline-flex items-center rounded-full bg-brand-burgundy/10 px-3 py-1 text-xs font-semibold tracking-wider text-brand-burgundy">
            HTTP {code}
          </span>
          <h1 className="font-display text-2xl font-bold text-brand-black">
            {title}
          </h1>
          <p className="mt-2 text-sm text-brand-muted">{subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button type="primary" size="large" onClick={onAction}>
              {actionLabel}
            </Button>
            {secondaryLabel && onSecondaryAction ? (
              <Button size="large" onClick={onSecondaryAction}>
                {secondaryLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
