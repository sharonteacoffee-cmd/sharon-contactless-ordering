import { Wrench } from 'lucide-react';
import { SystemErrorView } from '@/components/common/SystemErrorView';

export function MaintenancePage() {
  return (
    <SystemErrorView
      code="503"
      title="Steaming Up Maintenance"
      description="Our contactless ordering system is undergoing brief maintenance or is temporarily unreachable. Please order directly at the counter or retry in a moment."
      icon={<Wrench className="w-8 h-8" />}
      actionLabel="Try Again"
      onAction={() => window.location.assign('/')}
    />
  );
}
