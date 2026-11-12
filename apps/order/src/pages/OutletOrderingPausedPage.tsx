import { useLocation } from 'react-router-dom';
import { PauseCircle } from 'lucide-react';
import { SystemErrorView } from '@/components/common/SystemErrorView';

interface PausedLocationState {
  outletName?: string;
  operatingHours?: string;
}

export function OutletOrderingPausedPage() {
  const location = useLocation();
  const state = (location.state as PausedLocationState | null) ?? null;

  const outletLabel = state?.outletName ?? 'This Sharon Tea & Coffee branch';
  const hoursHint = state?.operatingHours
    ? ` Regular hours: ${state.operatingHours}.`
    : '';

  return (
    <SystemErrorView
      code="PAUSED"
      title="QR Ordering Temporarily Paused"
      description={`${outletLabel} is currently taking orders directly at the counter.${hoursHint}`}
      icon={<PauseCircle className="w-8 h-8" />}
      actionLabel="View Other Branches"
      actionTo="/"
    />
  );
}
