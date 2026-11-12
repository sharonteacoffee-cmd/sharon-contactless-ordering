import { useNavigate } from 'react-router-dom';
import { SystemErrorView } from '../components/common/SystemErrorView';

export function DashboardNotFoundPage() {
  const navigate = useNavigate();

  return (
    <SystemErrorView
      code="404"
      title="Dashboard Page Not Found"
      subtitle="The requested operations route does not exist."
      actionLabel="Open Live KDS"
      onAction={() => navigate('/kds', { replace: true })}
    />
  );
}
