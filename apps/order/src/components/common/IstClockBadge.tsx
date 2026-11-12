import { Clock } from 'lucide-react';
import { formatISTDateTime, formatISTTime } from '@sharon/shared';

interface IstClockBadgeProps {
  utcTimestamp: string;
  showDate?: boolean;
  className?: string;
}

export function IstClockBadge({
  utcTimestamp,
  showDate = false,
  className = '',
}: IstClockBadgeProps) {
  let formatted = '';
  try {
    formatted = showDate
      ? formatISTDateTime(utcTimestamp)
      : `${formatISTTime(utcTimestamp)} IST`;
  } catch {
    formatted = 'Time unavailable';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/80 border border-brand-border text-brand-muted tabular-price ${className}`}
    >
      <Clock className="w-3.5 h-3.5 text-brand-chai" />
      <span>{formatted}</span>
    </span>
  );
}
