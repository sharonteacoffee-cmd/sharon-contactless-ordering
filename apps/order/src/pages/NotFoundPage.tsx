import { Compass } from 'lucide-react';
import { SystemErrorView } from '@/components/common/SystemErrorView';

export function NotFoundPage() {
  return (
    <SystemErrorView
      code="404"
      title="Outlet or Order Not Found"
      description="This QR link or order token may be outdated or mistyped. Browse all active Sharon Tea & Coffee branches below."
      icon={<Compass className="w-8 h-8" />}
      actionLabel="Browse Sharon Outlets"
      actionTo="/"
    />
  );
}
