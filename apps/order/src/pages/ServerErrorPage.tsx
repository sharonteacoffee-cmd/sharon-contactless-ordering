import { AlertTriangle } from 'lucide-react';
import { SystemErrorView } from '@/components/common/SystemErrorView';

export function ServerErrorPage() {
  return (
    <SystemErrorView
      code="500"
      title="Unexpected Counter Error"
      description="Something unexpected happened on our end while processing your request. Tap below to reload and continue ordering."
      icon={<AlertTriangle className="w-8 h-8" />}
      actionLabel="Reload Page"
      onAction={() => window.location.assign('/')}
    />
  );
}
