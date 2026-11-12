import { useNavigate } from 'react-router-dom';
import { SystemErrorView } from '../components/common/SystemErrorView';

export function DashboardErrorPage() {
  const navigate = useNavigate();

  return (
    <SystemErrorView
      code="500"
      title="Something Went Wrong"
      subtitle="An unexpected error occurred on the operations dashboard. Please try again."
      actionLabel="Reload Live KDS"
      onAction={() => navigate('/kds', { replace: true })}
    />
  );
}
